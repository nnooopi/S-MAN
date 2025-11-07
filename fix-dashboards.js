const fs = require('fs');
const path = require('path');

function fixFile(fileName) {
  const filePath = path.join(__dirname, 'frontend', 'src', 'components', fileName);
  
  console.log(`\n📝 Processing: ${fileName}`);
  console.log(`   Path: ${filePath}`);
  
  // Read the file
  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;
  const originalLines = content.split('\n').length;
  
  console.log(`   Original: ${originalLines} lines, ${(originalLength/1024).toFixed(2)}KB`);
  
  // Count replacements
  const matches = content.match(/http:\/\/localhost:5000/g);
  const count = matches ? matches.length : 0;
  console.log(`   Found: ${count} instances of http://localhost:5000`);
  
  // Replace http://localhost:5000 with ${API_BASE_URL}
  content = content.replace(/http:\/\/localhost:5000/g, '${API_BASE_URL}');
  
  const newLength = content.length;
  const newLines = content.split('\n').length;
  
  console.log(`   After: ${newLines} lines, ${(newLength/1024).toFixed(2)}KB`);
  console.log(`   ✅ Replaced ${count} instances`);
  
  // Write back
  fs.writeFileSync(filePath, content, 'utf8');
}

// Fix both files
fixFile('CourseStudentDashboard.js');
fixFile('CourseProfessorDashboard.js');

console.log('\n✅ All files updated successfully!\n');
