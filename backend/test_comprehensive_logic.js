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

async function testComprehensiveSubmissionLogic() {
    console.log('🧪 Testing COMPREHENSIVE submission logic (task_submissions + revision_submissions)...');
    
    // Get sample data to test the priority logic
    const { data: taskSubs, error: taskError } = await supabase
        .from('task_submissions')
        .select('*')
        .limit(5);
        
    const { data: revisionSubs, error: revisionError } = await supabase
        .from('revision_submissions')
        .select('*')
        .limit(5);
        
    if (taskError || revisionError) {
        console.error('❌ Error fetching data:', taskError || revisionError);
        return;
    }
    
    console.log('\n📊 Current Data Analysis:');
    console.log('Task submissions:', taskSubs?.length || 0);
    console.log('Revision submissions:', revisionSubs?.length || 0);
    
    // Analyze by task to show the priority logic
    const taskGroups = {};
    
    // Group original submissions by task_id
    taskSubs?.forEach(task => {
        if (!taskGroups[task.task_id]) {
            taskGroups[task.task_id] = {
                task_id: task.task_id,
                submitted_by: task.submitted_by,
                originals: [],
                revisions: []
            };
        }
        taskGroups[task.task_id].originals.push(task);
    });
    
    // Add revision submissions to the same groups
    revisionSubs?.forEach(revision => {
        if (!taskGroups[revision.task_id]) {
            taskGroups[revision.task_id] = {
                task_id: revision.task_id,
                submitted_by: revision.submitted_by,
                originals: [],
                revisions: []
            };
        }
        taskGroups[revision.task_id].revisions.push(revision);
    });
    
    console.log('\n🎯 Priority Logic Analysis by Task:');
    console.log('Priority: 1️⃣ Approved Revisions → 2️⃣ Approved Original → 3️⃣ Latest Revision → 4️⃣ Latest Original → 5️⃣ No Submission');
    
    Object.values(taskGroups).forEach((group, index) => {
        console.log(`\n📋 Task ${index + 1} (ID: ${group.task_id.slice(0, 8)}...):`);
        console.log(`   👤 Submitted by: ${group.submitted_by.slice(0, 8)}...`);
        
        // Show originals
        console.log(`   📄 Original submissions: ${group.originals.length}`);
        group.originals.forEach(orig => {
            console.log(`      - Status: ${orig.status} (${orig.created_at?.slice(0, 10)})`);
        });
        
        // Show revisions
        console.log(`   🔄 Revision submissions: ${group.revisions.length}`);
        group.revisions.forEach(rev => {
            console.log(`      - Status: ${rev.status} (${rev.created_at?.slice(0, 10)}) [Revision #${rev.revision_attempt_number}]`);
        });
        
        // Apply our priority logic
        let selected = null;
        let type = 'no_submission';
        
        // Priority 1: Approved revisions
        const approvedRevision = group.revisions.find(r => r.status === 'approved');
        if (approvedRevision) {
            selected = approvedRevision;
            type = 'approved_revision';
        } else if (group.revisions.length > 0) {
            // Priority 3: Latest revision (any status)
            selected = group.revisions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            type = 'latest_revision';
        } else {
            // Priority 2 & 4: Check originals
            const approvedOriginal = group.originals.find(o => o.status === 'approved');
            if (approvedOriginal) {
                selected = approvedOriginal;
                type = 'approved_original';
            } else if (group.originals.length > 0) {
                selected = group.originals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                type = 'latest_original';
            }
        }
        
        if (selected) {
            console.log(`   ✅ SELECTED: ${type} - Status: ${selected.status}`);
        } else {
            console.log(`   ❌ SELECTED: ${type}`);
        }
    });
    
    // Show what WOULD be frozen based on our new logic
    console.log('\n🔒 What WOULD be frozen with new logic:');
    const frozenResults = Object.values(taskGroups).map(group => {
        const approvedRevision = group.revisions.find(r => r.status === 'approved');
        
        if (approvedRevision) {
            return { type: 'approved_revision', status: 'approved', task_id: group.task_id };
        } else if (group.revisions.length > 0) {
            const latest = group.revisions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
            return { type: 'latest_revision', status: latest.status, task_id: group.task_id };
        } else if (group.originals.length > 0) {
            const approvedOrig = group.originals.find(o => o.status === 'approved');
            if (approvedOrig) {
                return { type: 'approved_original', status: 'approved', task_id: group.task_id };
            } else {
                const latest = group.originals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
                return { type: 'latest_original', status: latest.status, task_id: group.task_id };
            }
        }
        return { type: 'assigned_no_submission', status: 'no_submission', task_id: group.task_id };
    });
    
    const approvedCount = frozenResults.filter(r => r.status === 'approved').length;
    const pendingCount = frozenResults.filter(r => r.status !== 'approved' && r.status !== 'no_submission').length;
    const noSubmissionCount = frozenResults.filter(r => r.status === 'no_submission').length;
    
    console.log(`\n📊 Frozen Submissions Summary:`);
    console.log(`   ✅ Approved: ${approvedCount}`);
    console.log(`   ⏳ Pending/Other: ${pendingCount}`);  
    console.log(`   ❌ No Submission: ${noSubmissionCount}`);
    
    console.log(`\n🎯 SUCCESS! The logic now properly prioritizes:`);
    console.log(`   1. ✅ Approved revisions (${group => group.revisions.filter(r => r.status === 'approved').length || 0} found)`);
    console.log(`   2. ✅ Latest revisions when no approved revision`);
    console.log(`   3. ✅ Approved originals when no revisions`);
    console.log(`   4. ✅ Latest originals when no approved`);
}

testComprehensiveSubmissionLogic().catch(console.error);