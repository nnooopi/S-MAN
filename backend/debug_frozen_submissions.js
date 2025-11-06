require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Environment check:');
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Found' : 'Missing');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Found' : 'Missing');

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function debugFrozenSubmissions() {
  const projectId = '87e2fe18-2725-47b4-96f6-6d0ae33b59d8';
  const groupId = 'ed82fd19-d1df-4ac7-9813-99aff39b516b';
  
  console.log('🔍 DEBUG: Analyzing frozen submissions data...\n');
  
  // 1. Check project_submissions
  console.log('1️⃣ PROJECT SUBMISSIONS:');
  const { data: projectSubs } = await supabase
    .from('project_submissions')
    .select('*')
    .eq('project_id', projectId)
    .eq('group_id', groupId);
  console.log(`   Found: ${projectSubs?.length || 0} project submissions`);
  if (projectSubs?.length) {
    console.log(`   Latest: ${projectSubs[0].submission_date} by ${projectSubs[0].submitted_by}`);
  }
  console.log('');

  // 2. Check project_phases 
  console.log('2️⃣ PROJECT PHASES:');
  const { data: phases } = await supabase
    .from('project_phases')
    .select('id, title, phase_number')
    .eq('project_id', projectId)
    .order('phase_number', { ascending: true });
  console.log(`   Found: ${phases?.length || 0} phases`);
  phases?.forEach(phase => {
    console.log(`   Phase ${phase.phase_number}: ${phase.title} (ID: ${phase.id})`);
  });
  console.log('');

  // 3. Check frozen_task_submissions
  console.log('3️⃣ FROZEN TASK SUBMISSIONS:');
  const { data: frozenSubs } = await supabase
    .from('frozen_task_submissions')
    .select('*')
    .eq('group_id', groupId);
  console.log(`   Found: ${frozenSubs?.length || 0} frozen submissions`);
  
  if (frozenSubs?.length) {
    console.log('\n   📋 FROZEN SUBMISSIONS BREAKDOWN:');
    frozenSubs.forEach((frozen, index) => {
      console.log(`   ${index + 1}. Task: "${frozen.task_title}"`);
      console.log(`      Phase ID: ${frozen.phase_id}`);
      console.log(`      Status: ${frozen.original_status}`);
      console.log(`      Student: ${frozen.student_id}`);
      console.log(`      Frozen: ${frozen.frozen_at}`);
      console.log('');
    });

    // Check if frozen phase IDs match actual phase IDs
    console.log('4️⃣ PHASE ID MATCHING:');
    const frozenPhaseIds = [...new Set(frozenSubs.map(f => f.phase_id))];
    const actualPhaseIds = phases?.map(p => p.id) || [];
    
    console.log(`   Frozen submission phase IDs: [${frozenPhaseIds.join(', ')}]`);
    console.log(`   Actual project phase IDs:    [${actualPhaseIds.join(', ')}]`);
    
    const matches = frozenPhaseIds.filter(id => actualPhaseIds.includes(id));
    const mismatches = frozenPhaseIds.filter(id => !actualPhaseIds.includes(id));
    
    console.log(`   ✅ Matching IDs: ${matches.length}`);
    console.log(`   ❌ Mismatched IDs: ${mismatches.length}`);
    
    if (mismatches.length > 0) {
      console.log(`   🚨 PROBLEM: Mismatched phase IDs: [${mismatches.join(', ')}]`);
    }
  }
  
  // 5. Test the exact query used by grading API
  console.log('\n5️⃣ GRADING API SIMULATION:');
  if (phases?.length) {
    for (const phase of phases) {
      console.log(`   Testing phase: ${phase.title} (${phase.id})`);
      
      const { data: testFrozen, error } = await supabase
        .from('frozen_task_submissions')
        .select('task_title, original_status')
        .eq('phase_id', phase.id)
        .eq('group_id', groupId);
        
      console.log(`   Result: ${testFrozen?.length || 0} frozen submissions${error ? ' (ERROR: ' + error.message + ')' : ''}`);
      
      if (testFrozen?.length) {
        testFrozen.forEach(t => {
          console.log(`     - ${t.task_title}: ${t.original_status}`);
        });
      }
    }
  }
  
  console.log('\n✅ DEBUG ANALYSIS COMPLETE');
}

debugFrozenSubmissions().catch(console.error);