// Quick test to verify backend code is updated
const fs = require('fs');
const path = require('path');

const studentLeaderApiPath = path.join(__dirname, 'backend', 'student-leader-api.js');
const content = fs.readFileSync(studentLeaderApiPath, 'utf8');

// Check if the bad code still exists
if (content.includes('available_until,') && content.includes('.select(`')) {
  // Check if it's in the projects endpoint (lines 48-80)
  const lines = content.split('\n');
  let inProjectsEndpoint = false;
  let foundBadCode = false;
  
  for (let i = 45; i < 85; i++) {
    if (lines[i].includes('available_until')) {
      console.log(`❌ FOUND BAD CODE at line ${i+1}: ${lines[i].trim()}`);
      foundBadCode = true;
      inProjectsEndpoint = true;
    }
  }
  
  if (!foundBadCode) {
    console.log('✅ Code is FIXED! No available_until in projects query');
  } else {
    console.log('❌ Code still has available_until in projects query');
  }
} else {
  console.log('✅ Code appears to be fixed');
}

// Check if evaluation_form columns are there
if (content.includes('evaluation_form_type') && content.includes('evaluation_form_file_url')) {
  console.log('✅ New evaluation_form columns are present');
} else {
  console.log('❌ Missing new evaluation_form columns');
}
