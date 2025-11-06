// Debug token authentication mapping
// This script simulates what happens in the authentication middleware

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://qorkowgfjjuwxelumuut.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs'
);

async function debugTokenAuth() {
  console.log('🔍 DEBUGGING TOKEN AUTHENTICATION MAPPING');
  console.log('='.repeat(60));
  
  const expectedEmail = 'mbsoriano4936val@student.fatima.edu.ph';
  const expectedStudentId = 'b7c6af2a-1fcb-4b72-ae69-088672884006';
  
  console.log(`Expected email: ${expectedEmail}`);
  console.log(`Expected student ID: ${expectedStudentId}`);
  
  // Simulate the authentication middleware logic
  console.log('\n1. TESTING EMAIL-BASED LOOKUP (Primary method):');
  try {
    const { data: stuByEmail, error: emailErr } = await supabase
      .from('studentaccounts')
      .select('*')
      .eq('email', expectedEmail)
      .single();
    
    if (stuByEmail && !emailErr) {
      console.log('✅ Email lookup SUCCESS');
      console.log(`Found student: ${stuByEmail.first_name} ${stuByEmail.last_name}`);
      console.log(`Database student ID: ${stuByEmail.id}`);
      console.log(`Email matches: ${stuByEmail.email === expectedEmail ? '✅' : '❌'}`);
      console.log(`ID matches expected: ${stuByEmail.id === expectedStudentId ? '✅' : '❌'}`);
    } else {
      console.log('❌ Email lookup FAILED');
      console.log('Error:', emailErr?.message);
    }
  } catch (emailError) {
    console.log('💥 Email lookup ERROR:', emailError.message);
  }
  
  console.log('\n2. TESTING ID-BASED LOOKUP (Fallback method):');
  try {
    const { data: stuById, error: idErr } = await supabase
      .from('studentaccounts')
      .select('*')
      .eq('id', expectedStudentId)
      .single();
    
    if (stuById && !idErr) {
      console.log('✅ ID lookup SUCCESS');
      console.log(`Found student: ${stuById.first_name} ${stuById.last_name}`);
      console.log(`Email: ${stuById.email}`);
    } else {
      console.log('❌ ID lookup FAILED');
      console.log('Error:', idErr?.message);
    }
  } catch (idError) {
    console.log('💥 ID lookup ERROR:', idError.message);
  }
  
  console.log('\n3. TESTING WHAT SUPABASE AUTH MIGHT RETURN:');
  // Check if there are any auth users with this email
  try {
    // Note: We can't directly query auth.users from service role in this context,
    // but we can check what the student record says
    const { data: authCheck, error: authError } = await supabase
      .from('studentaccounts')
      .select('id, email, created_at, updated_at')
      .eq('email', expectedEmail)
      .single();
    
    console.log('Student account details:', authCheck);
    
    if (authCheck) {
      console.log('\n4. TESTING AUTHENTICATION FLOW SIMULATION:');
      console.log('If Supabase Auth getUser() returns:');
      console.log(`  - user.id: Could be anything (Supabase Auth UID)`);
      console.log(`  - user.email: ${expectedEmail}`);
      console.log('\nThen authentication middleware should:');
      console.log(`  1. Look up by email: ${expectedEmail}`);
      console.log(`  2. Find student record: ${authCheck.id}`);
      console.log(`  3. Set req.user.id to: ${authCheck.id}`);
      console.log(`  4. Expected result: ${authCheck.id === expectedStudentId ? '✅ CORRECT' : '❌ WRONG'}`);
    }
  } catch (authError) {
    console.log('Error checking auth details:', authError.message);
  }
  
  console.log('\n5. FINAL DIAGNOSIS:');
  console.log('If 403 error occurs after login, it means:');
  console.log('  - Email lookup in auth middleware is failing');
  console.log('  - req.user.id is being set to wrong value');
  console.log('  - Leader dashboard cant find memberships');
  console.log('\nPossible causes:');
  console.log('  - Database connection timeout in auth middleware');
  console.log('  - Auth token contains wrong email');
  console.log('  - Race condition in student record lookup');
}

debugTokenAuth().catch(console.error);