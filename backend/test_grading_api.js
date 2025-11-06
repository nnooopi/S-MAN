const fetch = require('node-fetch');

async function testGradingAPI() {
    const projectId = '87e2fe18-2725-47b4-96f6-6d0ae33b59d8'; // test project
    const groupId = 'ed82fd19-d1df-4ac7-9813-99aff39b516b'; // Group 1
    
    console.log('🔍 Testing grading API endpoints...');
    
    // Test the group details endpoint
    try {
        const response = await fetch(`http://localhost:5000/api/grading/project/${projectId}/group/${groupId}`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.error('❌ API call failed:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Error body:', errorText);
            return;
        }
        
        const data = await response.json();
        console.log('✅ API response received');
        console.log('Project submission:', data.projectSubmission?.title || 'None');
        console.log('Phase submissions count:', data.phaseSubmissions?.length || 0);
        
        if (data.phaseSubmissions && data.phaseSubmissions.length > 0) {
            console.log('Phase submissions:');
            data.phaseSubmissions.forEach((sub, index) => {
                console.log(`  ${index + 1}. Phase: ${sub.phase?.title || 'Unknown'}, Status: ${sub.status}`);
            });
        }
        
        console.log('Task submissions count:', data.taskSubmissions?.length || 0);
        
        if (data.taskSubmissions && data.taskSubmissions.length > 0) {
            console.log('Task submissions:');
            data.taskSubmissions.forEach((sub, index) => {
                console.log(`  ${index + 1}. Task: ${sub.task?.title || 'Unknown'}, By: ${sub.submitted_by_student?.first_name || 'Unknown'}`);
            });
        }
        
    } catch (error) {
        console.error('❌ API test error:', error.message);
    }
}

testGradingAPI();