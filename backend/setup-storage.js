/**
 * Setup Supabase Storage Policies
 * Run with: node setup-storage.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupStorageBucket() {
  console.log('🚀 Setting up Supabase Storage...\n');

  try {
    // 1. Check if bucket exists
    console.log('1️⃣ Checking if custom-files bucket exists...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      throw listError;
    }

    const bucketExists = buckets.some(b => b.id === 'custom-files');

    if (!bucketExists) {
      // 2. Create bucket
      console.log('2️⃣ Creating custom-files bucket...');
      const { data: newBucket, error: createError } = await supabase.storage.createBucket('custom-files', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ]
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        throw createError;
      }

      console.log('✅ Bucket created successfully:', newBucket);
    } else {
      console.log('✅ Bucket already exists');
      
      // Update bucket to ensure it's public
      const { error: updateError } = await supabase.storage.updateBucket('custom-files', {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ]
      });

      if (updateError) {
        console.warn('⚠️ Could not update bucket settings:', updateError.message);
      } else {
        console.log('✅ Bucket settings updated');
      }
    }

    console.log('\n📝 IMPORTANT: You need to set up Storage Policies in Supabase Dashboard');
    console.log('   Go to: https://supabase.com/dashboard/project/[your-project]/storage/policies');
    console.log('   Or run the SQL script: backend/fix-storage-policies.sql');
    console.log('   In Supabase SQL Editor\n');

    // Test upload
    console.log('3️⃣ Testing file upload...');
    const testContent = 'test file content';
    const testFileName = `test_${Date.now()}.txt`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('custom-files')
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Test upload failed:', uploadError);
      console.log('\n⚠️ This is likely due to Row Level Security (RLS) policies.');
      console.log('   Please run the SQL script in backend/fix-storage-policies.sql');
      console.log('   in your Supabase SQL Editor to fix this.\n');
    } else {
      console.log('✅ Test upload successful!');
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('custom-files')
        .remove([testFileName]);
      
      if (!deleteError) {
        console.log('✅ Test file cleaned up');
      }
    }

    console.log('\n✅ Storage setup complete!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupStorageBucket();

