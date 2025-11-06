require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTables() {
  try {
    console.log('📊 Creating group_grades table...');
    
    // Create group_grades table
    const groupGradesSQL = `
      CREATE TABLE IF NOT EXISTS group_grades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
        project_submission_id UUID REFERENCES project_submissions(id) ON DELETE CASCADE,
        phase_submission_id UUID REFERENCES phase_submissions(id) ON DELETE CASCADE,
        group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
        grade DECIMAL(5,2) NOT NULL CHECK (grade >= 0 AND grade <= 100),
        feedback TEXT,
        grade_type VARCHAR(50) NOT NULL CHECK (grade_type IN ('project', 'phase', 'project_submission', 'phase_submission')),
        grading_criteria JSONB,
        graded_by UUID NOT NULL REFERENCES professoraccounts(id),
        graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT group_grades_reference_check CHECK (
          (project_id IS NOT NULL AND phase_id IS NULL AND project_submission_id IS NULL AND phase_submission_id IS NULL) OR
          (project_id IS NULL AND phase_id IS NOT NULL AND project_submission_id IS NULL AND phase_submission_id IS NULL) OR
          (project_id IS NULL AND phase_id IS NULL AND project_submission_id IS NOT NULL AND phase_submission_id IS NULL) OR
          (project_id IS NULL AND phase_id IS NULL AND project_submission_id IS NULL AND phase_submission_id IS NOT NULL)
        ),
        UNIQUE(group_id, project_id, phase_id, project_submission_id, phase_submission_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_group_grades_project ON group_grades(project_id) WHERE project_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_group_grades_phase ON group_grades(phase_id) WHERE phase_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_group_grades_group ON group_grades(group_id);
    `;

    const { data: groupResult, error: groupError } = await supabase
      .from('_supabase_admin')
      .select('*')
      .limit(0); // Just to test connection

    if (groupError) {
      console.log('Using direct SQL approach...');
      console.log('📝 Please execute this SQL in your Supabase SQL Editor:');
      console.log('='.repeat(60));
      console.log(groupGradesSQL);
      console.log('='.repeat(60));
    }

    console.log('📊 Creating individual_grades table...');
    
    const individualGradesSQL = `
      CREATE TABLE IF NOT EXISTS individual_grades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        group_grade_id UUID REFERENCES group_grades(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        phase_id UUID REFERENCES project_phases(id) ON DELETE CASCADE,
        project_submission_id UUID REFERENCES project_submissions(id) ON DELETE CASCADE,
        phase_submission_id UUID REFERENCES phase_submissions(id) ON DELETE CASCADE,
        task_submission_id UUID REFERENCES task_submissions(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES studentaccounts(id) ON DELETE CASCADE,
        group_id UUID NOT NULL REFERENCES course_groups(id) ON DELETE CASCADE,
        grade DECIMAL(5,2) NOT NULL CHECK (grade >= 0 AND grade <= 100),
        feedback TEXT,
        is_override BOOLEAN NOT NULL DEFAULT false,
        grade_type VARCHAR(50) NOT NULL CHECK (grade_type IN ('project', 'phase', 'project_submission', 'phase_submission', 'task')),
        grading_criteria JSONB,
        graded_by UUID NOT NULL REFERENCES professoraccounts(id),
        graded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT individual_grades_reference_check CHECK (
          (project_id IS NOT NULL) OR (phase_id IS NOT NULL) OR 
          (project_submission_id IS NOT NULL) OR (phase_submission_id IS NOT NULL) OR 
          (task_submission_id IS NOT NULL)
        ),
        CONSTRAINT individual_grades_unique_group_grade UNIQUE (student_id, group_grade_id),
        CONSTRAINT individual_grades_unique_project UNIQUE (student_id, project_id),
        CONSTRAINT individual_grades_unique_phase UNIQUE (student_id, phase_id),
        CONSTRAINT individual_grades_unique_project_submission UNIQUE (student_id, project_submission_id),
        CONSTRAINT individual_grades_unique_phase_submission UNIQUE (student_id, phase_submission_id),
        CONSTRAINT individual_grades_unique_task_submission UNIQUE (student_id, task_submission_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_individual_grades_student ON individual_grades(student_id);
      CREATE INDEX IF NOT EXISTS idx_individual_grades_group ON individual_grades(group_id);
      CREATE INDEX IF NOT EXISTS idx_individual_grades_group_grade ON individual_grades(group_grade_id) WHERE group_grade_id IS NOT NULL;
    `;

    console.log('📝 Please execute this SQL in your Supabase SQL Editor:');
    console.log('='.repeat(60));
    console.log(individualGradesSQL);
    console.log('='.repeat(60));

    console.log('\n🎉 SQL statements prepared! Please run them in your Supabase SQL editor.');
    console.log('\n📋 After running the SQL:');
    console.log('1. The group_grades table will handle group-level grades');
    console.log('2. The individual_grades table will handle individual overrides and task grades');
    console.log('3. Your professor grading API is ready to use these tables!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createTables();