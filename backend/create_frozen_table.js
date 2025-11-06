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

async function createFrozenTaskSubmissionsTable() {
    console.log('🔧 Creating frozen_task_submissions table...');
    
    const createTableSQL = `
-- Table to store frozen/snapshot versions of task submissions when leader submits phase
CREATE TABLE IF NOT EXISTS frozen_task_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links to original entities
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    phase_id UUID NOT NULL REFERENCES project_phases(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES studentaccounts(id) ON DELETE CASCADE,
    original_submission_id UUID REFERENCES task_submissions(id) ON DELETE SET NULL,
    
    -- Frozen task data (in case task gets modified later)
    task_title TEXT NOT NULL,
    task_description TEXT,
    
    -- Frozen submission data
    submission_text TEXT,
    file_urls TEXT DEFAULT '[]',
    original_status TEXT NOT NULL CHECK (original_status IN ('pending', 'approved', 'revision_requested', 'rejected', 'no_submission')),
    original_submitted_at TIMESTAMP WITH TIME ZONE,
    attempt_number INTEGER DEFAULT 0,
    
    -- Freeze metadata
    frozen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    frozen_by_leader UUID NOT NULL REFERENCES studentaccounts(id) ON DELETE CASCADE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one frozen record per phase/task/student combination
    UNIQUE(phase_id, task_id, student_id, group_id)
);
    `;
    
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: createTableSQL });
        
        if (error) {
            console.error('❌ Error creating table:', error);
        } else {
            console.log('✅ frozen_task_submissions table created successfully');
        }
    } catch (err) {
        // Try alternative method
        console.log('Trying alternative method...');
        const { error } = await supabase
            .from('frozen_task_submissions')
            .select('id')
            .limit(1);
            
        if (error && error.code === '42P01') {
            console.log('❌ Table does not exist. Please create it manually using the SQL file.');
        } else if (error) {
            console.log('❌ Error:', error.message);
        } else {
            console.log('✅ Table already exists or was created');
        }
    }
}

createFrozenTaskSubmissionsTable();