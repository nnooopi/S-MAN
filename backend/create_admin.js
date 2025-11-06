const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdminAccount(email, password, firstName, lastName) {
  try {
    console.log('🚀 Creating admin account...');
    console.log('Email:', email);
    console.log('Name:', firstName, lastName);
    console.log('=====================================');

    // Step 1: Check if admin already exists
    console.log('\n1. Checking for existing accounts...');
    
    const { data: existingAuth } = await supabase.auth.admin.listUsers();
    const existingUser = existingAuth.users.find(user => user.email === email);
    
    if (existingUser) {
      console.log('⚠️  User already exists in Supabase Auth:', existingUser.id);
      
      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from('adminaccounts')
        .select('*')
        .eq('email', email)
        .single();
      
      if (existingProfile) {
        console.log('✅ Admin profile already exists. Account is ready!');
        return { success: true, userId: existingUser.id };
      } else {
        console.log('📝 Creating missing admin profile...');
        // Create profile for existing user
        const { data: newProfile, error: profileError } = await supabase
          .from('adminaccounts')
          .insert([{
            id: existingUser.id,
            first_name: firstName,
            last_name: lastName,
            email: email
          }])
          .select()
          .single();

        if (profileError) {
          console.error('❌ Failed to create profile:', profileError);
          return { success: false, error: profileError };
        }

        console.log('✅ Admin profile created successfully!');
        return { success: true, userId: existingUser.id };
      }
    }

    // Step 2: Create Supabase Auth user
    console.log('\n2. Creating Supabase Auth user...');
    
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        firstName: firstName,
        lastName: lastName,
        userType: 'admin'
      }
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError);
      return { success: false, error: authError };
    }

    console.log('✅ Auth user created:', authUser.user.id);

    // Step 3: Create admin profile
    console.log('\n3. Creating admin profile...');
    
    const { data: adminProfile, error: profileError } = await supabase
      .from('adminaccounts')
      .insert([{
        id: authUser.user.id,
        first_name: firstName,
        last_name: lastName,
        email: email
      }])
      .select()
      .single();

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError);
      
      // Clean up auth user if profile creation failed
      console.log('🧹 Cleaning up auth user...');
      await supabase.auth.admin.deleteUser(authUser.user.id);
      
      return { success: false, error: profileError };
    }

    console.log('✅ Admin profile created successfully!');

    // Step 4: Test the account
    console.log('\n4. Testing the new account...');
    
    const { data: testSignin, error: testError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });

    if (testError) {
      console.error('⚠️  Account created but signin test failed:', testError);
    } else {
      console.log('✅ Signin test successful!');
      // Sign out the test session
      await supabase.auth.signOut();
    }

    console.log('\n🎉 Admin account creation completed!');
    console.log('=====================================');
    console.log('📋 Account Details:');
    console.log('   - User ID:', authUser.user.id);
    console.log('   - Email:', email);
    console.log('   - Password:', password);
    console.log('   - Name:', firstName, lastName);
    console.log('\n🔑 You can now sign in with these credentials!');

    return { 
      success: true, 
      userId: authUser.user.id,
      email: email,
      name: `${firstName} ${lastName}`
    };

  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return { success: false, error: error };
  }
}

// Create the admin account
async function main() {
  const result = await createAdminAccount(
    'admin@s-man.app',
    'admin123',     // Use a stronger password
    'Admin',
    'User'
  );

  if (result.success) {
    console.log('\n✅ SUCCESS: Admin account is ready to use!');
  } else {
    console.log('\n❌ FAILED: Could not create admin account');
    console.error('Error:', result.error);
  }

  process.exit(0);
}

main();