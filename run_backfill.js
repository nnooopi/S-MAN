// Quick script to run the backfill SQL
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://qorkowgfjjuwxelumuut.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFvcmtvd2dmamp1d3hlbHVtdXV0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODAyMDYwMywiZXhwIjoyMDczNTk2NjAzfQ.60CRB4D4LX9MnFzckDrA3iHpKIPqJBnBt94eAGBkHzs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runBackfill() {
  try {
    console.log('📊 Checking phases without evaluation forms...');
    
    // First, let's see which phases don't have evaluation forms
    const { data: phasesWithoutEval, error: checkError } = await supabase
      .from('project_phases')
      .select(`
        id,
        phase_number,
        project_id,
        end_date,
        projects(breathe_phase_days, evaluation_phase_days)
      `);

    if (checkError) {
      console.error('❌ Error fetching phases:', checkError);
      return;
    }

    console.log(`✅ Found ${phasesWithoutEval?.length || 0} phases`);
    
    // Check each phase for evaluation forms
    let phasesNeedingForms = [];
    
    for (const phase of phasesWithoutEval || []) {
      const { data: existingForms, error: formCheckError } = await supabase
        .from('phase_evaluation_forms')
        .select('id')
        .eq('phase_id', phase.id);
      
      if (!formCheckError && (!existingForms || existingForms.length === 0)) {
        phasesNeedingForms.push(phase);
      }
    }

    console.log(`\n📋 Phases needing evaluation forms: ${phasesNeedingForms.length}`);
    
    if (phasesNeedingForms.length === 0) {
      console.log('✅ All phases already have evaluation forms!');
      return;
    }

    // Create evaluation forms for phases that need them
    const formsToInsert = [];
    
    for (const phase of phasesNeedingForms) {
      const breatheDays = phase.projects?.breathe_phase_days || 0;
      const evalDays = phase.projects?.evaluation_phase_days || 7;
      
      // Calculate available_from: phase end + breathe days at 00:00:00
      const availableFrom = new Date(phase.end_date);
      availableFrom.setDate(availableFrom.getDate() + breatheDays);
      availableFrom.setHours(0, 0, 0, 0);
      
      // Calculate due_date: available_from + eval days - 1 second
      const dueDate = new Date(availableFrom);
      dueDate.setDate(dueDate.getDate() + evalDays);
      dueDate.setHours(23, 59, 59, 999);
      
      formsToInsert.push({
        phase_id: phase.id,
        available_from: availableFrom.toISOString(),
        due_date: dueDate.toISOString(),
        instructions: 'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.',
        total_points: 100
      });
      
      console.log(`  📅 Phase ${phase.phase_number}:`);
      console.log(`     - Available from: ${availableFrom.toISOString()}`);
      console.log(`     - Due: ${dueDate.toISOString()}`);
    }

    // Insert all forms
    if (formsToInsert.length > 0) {
      console.log(`\n📝 Inserting ${formsToInsert.length} evaluation forms...`);
      const { data: insertedForms, error: insertError } = await supabase
        .from('phase_evaluation_forms')
        .insert(formsToInsert)
        .select();

      if (insertError) {
        console.error('❌ Error inserting evaluation forms:', insertError);
        return;
      }

      console.log(`✅ Successfully inserted ${insertedForms?.length || 0} evaluation forms!`);
      console.log('\n📊 Inserted forms:');
      insertedForms?.forEach(form => {
        console.log(`  - Phase ${form.phase_id}: Available ${new Date(form.available_from).toLocaleDateString()} → Due ${new Date(form.due_date).toLocaleDateString()}`);
      });
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

runBackfill();
