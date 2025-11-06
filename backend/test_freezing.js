const fetch = require('node-fetch');

async function testPhaseSubmissionFreezing() {
    console.log('🧪 Testing phase submission with task freezing...');
    
    // First, let's check what phase submission data we can work with
    const projectId = '87e2fe18-2725-47b4-96f6-6d0ae33b59d8'; // test project
    const groupId = 'ed82fd19-d1df-4ac7-9813-99aff39b516b'; // Group 1
    const phaseId = '108d3c32-96ce-42ac-ae3a-56803eb9b23c'; // test1 phase
    
    console.log('Test data:', { projectId, groupId, phaseId });
    
    // Simulate leader phase submission
    const phaseSubmissionData = {
        phase_id: phaseId,
        submission_text: 'Test phase submission to trigger task freezing',
        file_urls: ['test-file.pdf']
    };
    
    try {
        const response = await fetch('http://localhost:5000/api/student-leader/phase-submissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token' // This would normally be a real token
            },
            body: JSON.stringify(phaseSubmissionData)
        });
        
        const result = await response.text();
        console.log('📤 Phase submission response:', response.status);
        console.log('📋 Response body:', result);
        
    } catch (error) {
        console.error('❌ Error testing phase submission:', error.message);
    }
}

testPhaseSubmissionFreezing();