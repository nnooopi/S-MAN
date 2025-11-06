const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function checkSubmissionTables() {
    console.log('🔍 Checking task_submissions and revision_submissions structure...');
    
    // Check task_submissions
    console.log('\n1. task_submissions table:');
    const { data: taskSubs, error: taskError } = await supabase
        .from('task_submissions')
        .select('*')
        .limit(2);
        
    if (taskError) {
        console.error('❌ task_submissions error:', taskError);
    } else {
        console.log('✅ task_submissions columns:', Object.keys(taskSubs[0] || {}));
        console.log('📊 Sample data:', taskSubs?.length || 0, 'records');
        if (taskSubs?.[0]) {
            console.log('   Sample:', {
                id: taskSubs[0].id,
                status: taskSubs[0].status,
                submitted_by: taskSubs[0].submitted_by,
                task_id: taskSubs[0].task_id
            });
        }
    }
    
    // Check revision_submissions
    console.log('\n2. revision_submissions table:');
    const { data: revisionSubs, error: revisionError } = await supabase
        .from('revision_submissions')
        .select('*')
        .limit(2);
        
    if (revisionError) {
        console.error('❌ revision_submissions error:', revisionError);
    } else {
        console.log('✅ revision_submissions columns:', Object.keys(revisionSubs[0] || {}));
        console.log('📊 Sample data:', revisionSubs?.length || 0, 'records');
        if (revisionSubs?.[0]) {
            console.log('   Sample:', {
                id: revisionSubs[0].id,
                status: revisionSubs[0].status,
                submitted_by: revisionSubs[0].submitted_by,
                original_submission_id: revisionSubs[0].original_submission_id,
                task_id: revisionSubs[0].task_id
            });
        }
    }
    
    // Check relationship: revisions linked to task submissions
    console.log('\n3. Relationship analysis:');
    if (taskSubs && revisionSubs && taskSubs.length > 0 && revisionSubs.length > 0) {
        const taskSubIds = taskSubs.map(t => t.id);
        const relatedRevisions = revisionSubs.filter(r => taskSubIds.includes(r.original_submission_id));
        console.log(`📎 Found ${relatedRevisions.length} revisions linked to sampled task submissions`);
    }
    
    // Check for all submissions by task and status
    console.log('\n4. Combined submission analysis (by status):');
    const { data: allTaskSubs, error: allTaskError } = await supabase
        .from('task_submissions')
        .select('id, task_id, submitted_by, status, created_at');
        
    const { data: allRevisionSubs, error: allRevisionError } = await supabase
        .from('revision_submissions')
        .select('id, task_id, submitted_by, status, created_at, original_submission_id');
        
    if (!allTaskError && !allRevisionError) {
        console.log('\nTask Submissions by status:');
        const taskStatuses = {};
        allTaskSubs?.forEach(sub => {
            taskStatuses[sub.status] = (taskStatuses[sub.status] || 0) + 1;
        });
        Object.entries(taskStatuses).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });
        
        console.log('\nRevision Submissions by status:');
        const revisionStatuses = {};
        allRevisionSubs?.forEach(sub => {
            revisionStatuses[sub.status] = (revisionStatuses[sub.status] || 0) + 1;
        });
        Object.entries(revisionStatuses).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });
        
        console.log('\n📋 CRITICAL INSIGHT:');
        console.log('- Original task_submissions:', allTaskSubs?.length || 0);
        console.log('- Revision submissions:', allRevisionSubs?.length || 0);
        console.log('- We need to check BOTH tables for the latest/approved submissions!');
    }
}

checkSubmissionTables().catch(console.error);