const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'CourseProfessorDashboard.js');

console.log('Reading file:', filePath);
let content = fs.readFileSync(filePath, 'utf8');

// Replace http://localhost:5000 with ${API_BASE_URL} in template literals
// This regex finds 'http://localhost:5000 followed by /api
content = content.replace(/http:\/\/localhost:5000(?=\/api)/g, '${API_BASE_URL}');

// Also replace the plain strings (non-template literal)
content = content.replace(/'http:\/\/localhost:5000\/api/g, '`${API_BASE_URL}/api');
content = content.replace(/\/api\/professor\/profile'/g, '/professor/profile`');
content = content.replace(/\/api\/professor\/courses'/g, '/professor/courses`');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File updated successfully!');
console.log('Replaced all http://localhost:5000 with ${API_BASE_URL}');
