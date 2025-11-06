require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Use service role key for admin operations
);

async function createGradesTables() {
  try {
    console.log('📊 Creating new grading tables...');
    
    const sql = fs.readFileSync('comprehensive_grades_tables.sql', 'utf8');
    
    // Split SQL into individual statements and execute them
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim() + ';';
      if (statement.length > 1) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        const { data, error } = await supabase.rpc('exec_sql', {
          query: statement
        });
        
        if (error) {
          console.error('❌ Error executing statement:', error);
          console.error('Statement:', statement.substring(0, 200) + '...');
        } else {
          console.log('✅ Statement executed successfully');
        }
      }
    }
    
    console.log('🎉 All grading tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createGradesTables();