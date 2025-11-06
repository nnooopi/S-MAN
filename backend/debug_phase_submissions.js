const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create service role client for debugging
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

async function debugPhaseSubmissions() {
    console.log('🔍 DEBUG: Checking phase submissions data...');
    
    // First, check if there are any projects for this course
    const courseId = 'bc074d58-8244-403f-8eb5-b838e189acea';
    
    console.log('\n1. Checking projects for course:', courseId);
    const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('course_id', courseId);
    
    if (projectsError) {
        console.error('❌ Projects error:', projectsError);
        return;
    }
    
    console.log('✅ Projects found:', projects?.length || 0);
    projects?.forEach(project => {
        console.log(`   - ${project.title} (ID: ${project.id})`);
    });
    
    if (!projects || projects.length === 0) {
        console.log('❌ No projects found for this course');
        return;
    }
    
    // Check project phases
    console.log('\n2. Checking project phases...');
    const { data: phases, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .in('project_id', projects.map(p => p.id));
    
    if (phasesError) {
        console.error('❌ Phases error:', phasesError);
        return;
    }
    
    console.log('✅ Phases found:', phases?.length || 0);
    phases?.forEach(phase => {
        console.log(`   - Phase ${phase.phase_number}: ${phase.title} (ID: ${phase.id}, Project: ${phase.project_id})`);
    });
    
    if (!phases || phases.length === 0) {
        console.log('❌ No phases found for these projects');
        console.log('💡 You need to create project phases first before phase submissions can exist');
        return;
    }
    
    // Check groups
    console.log('\n3. Checking groups for course:', courseId);
    const { data: groups, error: groupsError } = await supabase
        .from('course_groups')
        .select('*')
        .eq('course_id', courseId);
    
    if (groupsError) {
        console.error('❌ Groups error:', groupsError);
        return;
    }
    
    console.log('✅ Groups found:', groups?.length || 0);
    groups?.forEach(group => {
        console.log(`   - ${group.group_name || group.name || 'Unnamed'} (ID: ${group.id})`);
    });
    
    // Check phase submissions
    console.log('\n4. Checking phase submissions...');
    const { data: phaseSubmissions, error: phaseSubmissionsError } = await supabase
        .from('phase_submissions')
        .select(`
            *,
            project_phases(
                id,
                title,
                phase_number,
                project_id
            ),
            course_groups(
                id,
                group_name,
                course_id
            )
        `)
        .eq('course_groups.course_id', courseId);
    
    if (phaseSubmissionsError) {
        console.error('❌ Phase submissions error:', phaseSubmissionsError);
        console.log('   Trying alternative query...');
        
        // Try simpler query
        const { data: simplePhaseSubmissions, error: simpleError } = await supabase
            .from('phase_submissions')
            .select('*');
            
        if (simpleError) {
            console.error('❌ Simple phase submissions error:', simpleError);
        } else {
            console.log('✅ Simple phase submissions found:', simplePhaseSubmissions?.length || 0);
        }
        return;
    }
    
    console.log('✅ Phase submissions found:', phaseSubmissions?.length || 0);
    phaseSubmissions?.forEach(submission => {
        console.log(`   - Group: ${submission.course_groups?.group_name || 'Unknown'}, Phase: ${submission.project_phases?.title || 'Unknown'}, Status: ${submission.status}`);
    });
    
    // Check task submissions
    console.log('\n5. Checking task submissions...');
    const { data: taskSubmissions, error: taskSubmissionsError } = await supabase
        .from('task_submissions')
        .select(`
            *,
            project_phases(
                id,
                title,
                phase_number,
                project_id
            ),
            course_groups(
                id,
                group_name,
                course_id
            )
        `)
        .eq('course_groups.course_id', courseId);
    
    if (taskSubmissionsError) {
        console.error('❌ Task submissions error:', taskSubmissionsError);
        console.log('   Trying alternative query...');
        
        // Try simpler query
        const { data: simpleTaskSubmissions, error: simpleTaskError } = await supabase
            .from('task_submissions')
            .select('*');
            
        if (simpleTaskError) {
            console.error('❌ Simple task submissions error:', simpleTaskError);
        } else {
            console.log('✅ Simple task submissions found:', simpleTaskSubmissions?.length || 0);
        }
        return;
    }
    
    console.log('✅ Task submissions found:', taskSubmissions?.length || 0);
    taskSubmissions?.forEach(submission => {
        console.log(`   - Group: ${submission.course_groups?.group_name || 'Unknown'}, Phase: ${submission.project_phases?.title || 'Unknown'}, Task: ${submission.task_title || 'N/A'}`);
    });
    
    console.log('\n📊 SUMMARY:');
    console.log(`   - Projects: ${projects?.length || 0}`);
    console.log(`   - Phases: ${phases?.length || 0}`);
    console.log(`   - Groups: ${groups?.length || 0}`);
    console.log(`   - Phase Submissions: ${phaseSubmissions?.length || 0}`);
    console.log(`   - Task Submissions: ${taskSubmissions?.length || 0}`);
    
    if (phases?.length === 0) {
        console.log('\n💡 RECOMMENDATION: Create project phases first!');
        console.log('   You need to set up phases for your project before students can submit phase work.');
        console.log('   Phase submissions depend on project phases existing in the database.');
    }
}

debugPhaseSubmissions().catch(console.error);