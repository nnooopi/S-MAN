const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend', 'src', 'components', 'CourseStudentDashboard.js');

console.log('Reading file:', filePath);
let content = fs.readFileSync(filePath, 'utf8');

// Replace http://localhost:5000 with ${API_BASE_URL}
content = content.replace(/http:\/\/localhost:5000/g, '${API_BASE_URL}');

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ File updated successfully!');
console.log('Replaced all http://localhost:5000 with ${API_BASE_URL}');
