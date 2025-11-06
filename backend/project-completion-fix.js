// Clean project completion endpoint
// POST /api/student-leader/project-completion/:projectId - Submit project completion
router.post('/project-completion/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { submission_text, file_urls } = req.body;
    const student_id = req.user.id;
    
    console.log('📤 Project completion submission for project:', projectId);
    console.log('📄 Submission text:', submission_text);
    console.log('📎 File URLs:', file_urls);
    
    // Verify user is a leader
    const { data: membership, error: membershipError } = await supabase
      .from('course_group_members')
      .select('role, group_id')
      .eq('student_id', student_id)
      .eq('role', 'leader')
      .eq('is_active', true);
    
    if (membershipError || !membership || membership.length === 0) {
      return res.status(403).json({ error: 'Access denied - must be group leader' });
    }
    
    const groupId = membership[0].group_id;
    
    // Use provided file URLs (files were already uploaded via upload-phase-file endpoint)
    if (!file_urls || file_urls.length === 0) {
      return res.status(400).json({ error: 'No files provided for project completion' });
    }
    
    console.log('📎 Using pre-uploaded files:', file_urls.length);
    
    // Get project due date to check if submission is late
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('due_date')
      .eq('id', projectId)
      .single();
      
    const isLate = project ? new Date() > new Date(project.due_date) : false;
    
    // Check if project submission already exists
    const { data: existingSubmission } = await supabase
      .from('project_submissions')
      .select()
      .eq('project_id', projectId)
      .eq('group_id', groupId)
      .single();
    
    if (existingSubmission) {
      return res.status(409).json({ 
        error: 'Project completion already submitted',
        submission: existingSubmission
      });
    }
    
    // Create project submission record
    const { data: submission, error: insertError } = await supabase
      .from('project_submissions')
      .insert({
        project_id: projectId,
        group_id: groupId,
        submitted_by: student_id,
        file_urls: file_urls,
        submission_text: submission_text || 'Project Completion Submission',
        is_late: isLate
      })
      .select()
      .single();
      
    if (insertError) {
      console.error('❌ Error creating project submission:', insertError);
      return res.status(500).json({ error: 'Failed to create project submission record' });
    }
    
    console.log('✅ Project completion submitted successfully:', submission.id);
    
    res.json({
      success: true,
      action: 'created',
      submission: {
        id: submission.id,
        project_id: submission.project_id,
        group_id: submission.group_id,
        file_urls: submission.file_urls,
        submission_date: submission.submission_date,
        status: submission.status,
        is_late: submission.is_late
      },
      message: 'Project completion submitted successfully',
      filesUploaded: file_urls.length
    });
    
  } catch (error) {
    console.error('❌ Error in project completion submission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});