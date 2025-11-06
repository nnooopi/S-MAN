// Fix is_active column type and values
// This script converts string 'true'/'false' values to proper booleans in Supabase

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixIsActiveColumn() {
  try {
    console.log('🔧 Starting fix for is_active column type...\n');

    // Get all course_group_members with string 'true'/'false'
    const { data: members, error: fetchError } = await supabase
      .from('course_group_members')
      .select('id, is_active')
      .limit(1000);

    if (fetchError) {
      console.error('❌ Error fetching members:', fetchError);
      return;
    }

    console.log(`📊 Found ${members?.length || 0} course_group_members records\n`);

    // Update is_active values to proper booleans
    let trueCount = 0;
    let falseCount = 0;

    for (const member of members || []) {
      // Skip if already boolean
      if (typeof member.is_active === 'boolean') {
        console.log(`✓ Member ${member.id} already has boolean is_active`);
        continue;
      }

      const shouldBeActive = member.is_active === true || 
                            member.is_active === 'true' || 
                            member.is_active === '1' ||
                            member.is_active === 1;

      const { error: updateError } = await supabase
        .from('course_group_members')
        .update({ is_active: shouldBeActive })
        .eq('id', member.id);

      if (updateError) {
        console.error(`❌ Error updating member ${member.id}:`, updateError);
      } else {
        if (shouldBeActive) {
          trueCount++;
          console.log(`✅ Member ${member.id}: is_active = true (boolean)`);
        } else {
          falseCount++;
          console.log(`✅ Member ${member.id}: is_active = false (boolean)`);
        }
      }
    }

    console.log(`\n✅ Conversion complete!`);
    console.log(`   - True values: ${trueCount}`);
    console.log(`   - False values: ${falseCount}`);
    console.log(`\n🔍 Verifying fix...`);

    // Verify the fix
    const { data: verified } = await supabase
      .from('course_group_members')
      .select('id, is_active')
      .limit(5);

    console.log('Sample records after fix:');
    verified?.forEach(m => {
      console.log(`  - ID: ${m.id}, is_active: ${m.is_active} (type: ${typeof m.is_active})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixIsActiveColumn();
