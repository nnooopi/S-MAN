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

async function debugSpecificProject() {
    const projectId = '87e2fe18-2725-47b4-96f6-6d0ae33b59d8'; // test project
    const groupId = 'ed82fd19-d1df-4ac7-9813-99aff39b516b'; // Group 1
    
    console.log('🔍 DEBUG: Checking specific project grading data...');
    console.log('Project ID:', projectId);
    console.log('Group ID:', groupId);
    
    // Get project details
    const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
        
    if (projectError) {
        console.error('❌ Project error:', projectError);
        return;
    }
    
    console.log('✅ Project:', project.title);
    
    // Get project submission
    const { data: projectSubmission, error: projSubError } = await supabase
        .from('project_submissions')
        .select(`
            *,
            submitted_by_student:studentaccounts(
                id,
                first_name,
                last_name,
                student_number
            )
        `)
        .eq('project_id', projectId)
        .eq('group_id', groupId)
        .single();
        
    if (projSubError) {
        console.error('❌ Project submission error:', projSubError);
    } else {
        console.log('✅ Project submission found:', projectSubmission.title);
    }
    
    // Get phases for this project
    const { data: phases, error: phasesError } = await supabase
        .from('project_phases')
        .select('*')
        .eq('project_id', projectId)
        .order('phase_number', { ascending: true });
        
    if (phasesError) {
        console.error('❌ Phases error:', phasesError);
        return;
    }
    
    console.log('✅ Phases found:', phases?.length || 0);
    phases?.forEach(phase => {
        console.log(`   - Phase ${phase.phase_number}: ${phase.title} (ID: ${phase.id})`);
    });
    
    // Get phase submissions for this group using exact same logic as API
    const phaseIds = phases.map(phase => phase.id);
    console.log('Phase IDs to check:', phaseIds);
    
    if (phaseIds.length > 0) {
        const { data: phaseSubmissionsData, error: phaseSubmissionsError } = await supabase
            .from('phase_submissions')
            .select(`
                *,
                phase:project_phases(
                    id,
                    title,
                    phase_number,
                    description
                ),
                submitted_by_student:studentaccounts(
                    id,
                    first_name,
                    last_name,
                    student_number
                )
            `)
            .in('phase_id', phaseIds)
            .eq('group_id', groupId);
            
        if (phaseSubmissionsError) {
            console.error('❌ Phase submissions error:', phaseSubmissionsError);
        } else {
            console.log('✅ Phase submissions found:', phaseSubmissionsData?.length || 0);
            phaseSubmissionsData?.forEach(sub => {
                console.log(`   - Phase: ${sub.phase.title}, Status: ${sub.status}, By: ${sub.submitted_by_student.first_name}`);
            });
        }
    }
}

debugSpecificProject().catch(console.error);