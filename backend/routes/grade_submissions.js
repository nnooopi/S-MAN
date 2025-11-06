const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Export a function that takes the supabase client
module.exports = (supabase) => {
  const router = express.Router();

  // Helper to get fresh Supabase client for grade submissions
  const getFreshSupabaseClient = () => {
    return createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
            'x-request-id': `req-${Date.now()}-${Math.random()}`
          }
        }
      }
    );
  };

  // Helper to safely parse JSON fields
  const parseJSONField = (field) => {
    if (!field) return null;
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch (e) {
        console.warn('Failed to parse JSON field:', e.message);
        return field;
      }
    }
    return field;
  };

  // Helper to fetch complete phase rubric data (both built-in and custom)
  const fetchPhaseRubricData = async (phaseId, freshSupabaseClient) => {
    try {
      console.log(`[Rubric] Fetching rubric for phase ${phaseId}`);
      
      // Fetch built-in rubric if it exists
      const { data: phaseRubric, error: builtinError } = await freshSupabaseClient
        .from('phase_rubrics')
        .select('*, phase_rubric_criteria(*)')
        .eq('phase_id', phaseId)
        .single();

      if (phaseRubric) {
        console.log(`[Rubric] Found built-in rubric for phase ${phaseId}:`, phaseRubric);
        return {
          type: 'builtin',
          data: phaseRubric
        };
      }

      console.log(`[Rubric] No built-in rubric found for phase ${phaseId}, checking custom...`);

      // Fetch custom rubric if built-in doesn't exist
      const { data: customRubric, error: customError } = await freshSupabaseClient
        .from('phase_custom_rubrics')
        .select('*')
        .eq('phase_id', phaseId)
        .single();

      if (customRubric) {
        console.log(`[Rubric] Found custom rubric for phase ${phaseId}:`, customRubric);
        return {
          type: 'custom',
          data: customRubric
        };
      }

      console.log(`[Rubric] No rubric found for phase ${phaseId}`);
      return null;
    } catch (error) {
      console.warn(`[Rubric] Error fetching phase rubric for phase ${phaseId}:`, error.message);
      return null;
    }
  };

  // Helper to fetch complete project rubric data (both built-in and custom)
  const fetchProjectRubricData = async (projectId, freshSupabaseClient) => {
    try {
      console.log(`[Rubric] Fetching rubric for project ${projectId}`);
      
      // Fetch built-in rubric if it exists
      const { data: projectRubric, error: builtinError } = await freshSupabaseClient
        .from('project_rubrics')
        .select('*, project_rubric_criteria(*)')
        .eq('project_id', projectId)
        .single();

      if (projectRubric) {
        console.log(`[Rubric] Found built-in rubric for project ${projectId}:`, projectRubric);
        return {
          type: 'builtin',
          data: projectRubric
        };
      }

      console.log(`[Rubric] No built-in rubric found for project ${projectId}, checking custom...`);

      // Fetch custom rubric if built-in doesn't exist
      const { data: customRubric, error: customError } = await freshSupabaseClient
        .from('project_custom_rubrics')
        .select('*')
        .eq('project_id', projectId)
        .single();

      if (customRubric) {
        console.log(`[Rubric] Found custom rubric for project ${projectId}:`, customRubric);
        return {
          type: 'custom',
          data: customRubric
        };
      }

      console.log(`[Rubric] No rubric found for project ${projectId}`);
      return null;
    } catch (error) {
      console.warn(`[Rubric] Error fetching project rubric for project ${projectId}:`, error.message);
      return null;
    }
  };

  // Middleware to verify professor authentication
  const verifyProfessor = async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1] || req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        console.error('[Grade Submissions Auth] No token provided');
        return res.status(401).json({ error: 'No authorization token provided' });
      }

      console.log('[Grade Submissions Auth] Verifying token...');
      
      // Try Supabase Auth first
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (user && !error) {
        console.log('[Grade Submissions Auth] User authenticated:', user.id);

        // Verify user is a professor with retry logic
        let professor = null;
        let attempts = 0;
        const maxAttempts = 3;
        
        while (!professor && attempts < maxAttempts) {
          attempts++;
          console.log(`[Grade Submissions Auth] Database lookup attempt ${attempts}/${maxAttempts}`);
          
          try {
            const freshSupabase = getFreshSupabaseClient();
            // Use regular select without .single() to handle empty results properly
            const { data: profiles, error: profileError } = await freshSupabase
              .from('professoraccounts')
              .select('*')
              .eq('id', user.id);

            if (profileError) {
              console.log(`[Grade Submissions Auth] Query error on attempt ${attempts}:`, profileError?.message);
            } else if (profiles && profiles.length > 0) {
              professor = profiles[0];
              console.log('[Grade Submissions Auth] Professor verified:', professor.id);
              break;
            } else {
              console.log(`[Grade Submissions Auth] Attempt ${attempts}: No professor record found for user ${user.id}`);
            }

            if (!professor && attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 100 * attempts));
            }
          } catch (dbError) {
            console.log(`[Grade Submissions Auth] Database error on attempt ${attempts}:`, dbError.message);
            if (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 100 * attempts));
            }
          }
        }

        if (professor) {
          req.user = user;
          req.professorId = professor.id;
          req.professor = professor;
          console.log('[Grade Submissions Auth] Professor authentication successful');
          return next();
        } else {
          console.error('[Grade Submissions Auth] No professor record found after all attempts for user:', user.id);
        }
      }

      // If Supabase Auth fails, try JWT verification (for legacy tokens)
      try {
        console.log('[Grade Submissions Auth] Trying JWT verification...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        if (decoded.userType === 'professor') {
          console.log('[Grade Submissions Auth] Valid JWT token for:', decoded.email);
          
          const freshSupabase = getFreshSupabaseClient();
          const { data: professor, error: profErr } = await freshSupabase
            .from('professoraccounts')
            .select('*')
            .eq('email', decoded.email)
            .single();
            
          if (professor && !profErr) {
            console.log('[Grade Submissions Auth] Found professor via JWT:', professor.email);
            req.user = {
              id: professor.id,
              email: professor.email
            };
            req.professorId = professor.id;
            req.professor = professor;
            return next();
          }
        }
      } catch (jwtError) {
        console.log('[Grade Submissions Auth] JWT verification failed:', jwtError.message);
      }

      console.error('[Grade Submissions Auth] Authentication failed for token');
      return res.status(403).json({ error: 'User is not a professor' });
      
    } catch (error) {
      console.error('[Grade Submissions Auth] Authentication error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  };

  // Get all submissions for a course (both phase and project)
  router.get('/courses/:courseId/all-submissions', verifyProfessor, async (req, res) => {
    try {
      const { courseId } = req.params;
      const freshSupabase = getFreshSupabaseClient();

      console.log(`[Grade Submissions] Fetching all submissions for course: ${courseId}, Professor: ${req.professorId}`);

      // Verify professor owns this course
      const { data: course, error: courseError } = await freshSupabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .eq('professor_id', req.professorId)
        .single();

      if (courseError) {
        console.error('[Grade Submissions] Course lookup error:', courseError);
        return res.status(500).json({ error: 'Failed to fetch course', details: courseError.message });
      }

      if (!course) {
        console.log(`[Grade Submissions] Course not found or access denied: ${courseId}`);
        return res.status(404).json({ error: 'Course not found or access denied' });
      }

      // Get phase deliverable submissions
      const { data: phaseSubmissions, error: phaseError } = await freshSupabase
        .from('phase_deliverable_submissions')
        .select(`
          *,
          projects!inner(id, title, course_id, min_tasks_per_member, max_tasks_per_member),
          project_phases(id, phase_number, title, end_date, rubric, rubric_file_url),
          course_groups(id, group_name),
          studentaccounts!phase_deliverable_submissions_submitted_by_fkey(
            id, first_name, last_name, student_number, profile_image_url
          ),
          professoraccounts!phase_deliverable_submissions_graded_by_fkey(
            id, first_name, last_name
          )
        `)
        .eq('projects.course_id', courseId)
        .order('submitted_at', { ascending: false });

      if (phaseError) {
        console.error('Error fetching phase submissions:', phaseError);
        return res.status(500).json({ error: 'Failed to fetch phase submissions' });
      }

      // Log first phase submission to debug resubmission fields
      if (phaseSubmissions && phaseSubmissions.length > 0) {
        console.log('[Grade Submissions] First phase submission raw:', {
          id: phaseSubmissions[0].id,
          is_resubmission: phaseSubmissions[0].is_resubmission,
          resubmission_number: phaseSubmissions[0].resubmission_number,
          original_submission_id: phaseSubmissions[0].original_submission_id
        });
      }

      // Get project deliverable submissions
      const { data: projectSubmissions, error: projectError } = await freshSupabase
        .from('project_deliverable_submissions')
        .select(`
          *,
          projects!inner(id, title, course_id, MAXATTEMPT),
          course_groups(id, group_name),
          studentaccounts!project_deliverable_submissions_submitted_by_fkey(
            id, first_name, last_name, student_number, profile_image_url
          ),
          professoraccounts!project_deliverable_submissions_graded_by_fkey(
            id, first_name, last_name
          )
        `)
        .eq('projects.course_id', courseId)
        .order('submitted_at', { ascending: false });

      if (projectError) {
        console.error('Error fetching project submissions:', projectError);
        return res.status(500).json({ error: 'Failed to fetch project submissions' });
      }

      // Debug: Log first project submission to see structure
      if (projectSubmissions && projectSubmissions.length > 0) {
        const firstSub = projectSubmissions[0];
        console.log('[Grade Submissions] First project submission structure:', {
          id: firstSub.id,
          project_id: firstSub.project_id,
          projects: firstSub.projects,
          hasMAXATTEMPT: !!firstSub.projects?.MAXATTEMPT,
          projectsKeys: firstSub.projects ? Object.keys(firstSub.projects) : 'no projects',
          project_snapshot: firstSub.project_snapshot ? 'has snapshot' : 'no snapshot'
        });
      }

      // Format phase submissions
      const formattedPhaseSubmissions = (phaseSubmissions || []).map(sub => ({
        id: sub.id,
        type: 'phase',
        projectId: sub.project_id,
        projectTitle: sub.projects?.title,
        phaseId: sub.phase_id,
        phaseNumber: sub.project_phases?.phase_number,
        phaseTitle: sub.project_phases?.title,
        groupId: sub.group_id,
        groupName: sub.course_groups?.group_name,
        submittedBy: sub.studentaccounts ? {
          id: sub.studentaccounts.id,
          firstName: sub.studentaccounts.first_name,
          lastName: sub.studentaccounts.last_name,
          studentNumber: sub.studentaccounts.student_number,
          profileImage: sub.studentaccounts.profile_image_url
        } : null,
        submittedAt: sub.submitted_at,
        files: parseJSONField(sub.files),
        submissionText: sub.submission_text,
        status: sub.status,
        grade: sub.grade,
        maxGrade: sub.max_grade,
        gradedBy: sub.professoraccounts ? {
          id: sub.professoraccounts.id,
          firstName: sub.professoraccounts.first_name,
          lastName: sub.professoraccounts.last_name
        } : null,
        gradedAt: sub.graded_at,
        instructorFeedback: sub.instructor_feedback,
        isResubmission: sub.is_resubmission,
        resubmissionNumber: sub.resubmission_number,
        originalSubmissionId: sub.original_submission_id,
        submittedAt: sub.submitted_at,
        phaseSnapshot: (() => {
          const snapshot = parseJSONField(sub.phase_snapshot) || {};
          return {
            ...snapshot,
            projectTitle: snapshot.projectTitle || sub.projects?.title,
            phaseNumber: snapshot.phaseNumber || sub.project_phases?.phase_number,
            title: snapshot.title || sub.project_phases?.title,
            end_date: snapshot.end_date || sub.project_phases?.end_date,
            min_tasks_per_member: snapshot.min_tasks_per_member !== undefined ? snapshot.min_tasks_per_member : sub.projects?.min_tasks_per_member,
            max_tasks_per_member: snapshot.max_tasks_per_member !== undefined ? snapshot.max_tasks_per_member : sub.projects?.max_tasks_per_member,
            rubric: snapshot.rubric || sub.project_phases?.rubric || null,
            rubric_file_url: snapshot.rubric_file_url || sub.project_phases?.rubric_file_url || null
          };
        })(),
        memberTasks: parseJSONField(sub.member_tasks),
        evaluationSubmissions: parseJSONField(sub.evaluation_submissions),
        memberInclusions: parseJSONField(sub.member_inclusions),
        validationResults: parseJSONField(sub.validation_results)
      }));

      // Format project submissions
      const formattedProjectSubmissions = (projectSubmissions || []).map(sub => {
        const projectSnapshot = parseJSONField(sub.project_snapshot) || {};
        
        // If MAXATTEMPT is missing from snapshot, use it from the joined projects table
        // Try multiple possible property names (PostgreSQL/Supabase may normalize casing)
        if (!projectSnapshot.MAXATTEMPT && !projectSnapshot.max_attempts) {
          // Handle both object and array formats
          const projectsObj = Array.isArray(sub.projects) ? sub.projects[0] : sub.projects;
          
          // Try all possible property name variations
          const maxAttemptValue = projectsObj?.MAXATTEMPT ?? 
                                  projectsObj?.maxattempt ??
                                  projectsObj?.max_attempts ??
                                  projectsObj?.maxAttempts;
          
          if (maxAttemptValue !== null && maxAttemptValue !== undefined) {
            projectSnapshot.MAXATTEMPT = maxAttemptValue;
            console.log(`[Grade Submissions] ✅ Added MAXATTEMPT from projects join for project ${sub.project_id}: ${maxAttemptValue}`);
          } else {
            const availableKeys = projectsObj ? Object.keys(projectsObj) : [];
            console.log(`[Grade Submissions] ❌ MAXATTEMPT not found for project ${sub.project_id}. Available keys:`, availableKeys);
            console.log(`[Grade Submissions] Full projects object:`, JSON.stringify(projectsObj, null, 2));
          }
        } else {
          console.log(`[Grade Submissions] ✅ MAXATTEMPT already in snapshot for project ${sub.project_id}: ${projectSnapshot.MAXATTEMPT || projectSnapshot.max_attempts}`);
        }
        
        return {
          id: sub.id,
          type: 'project',
          projectId: sub.project_id,
          projectTitle: sub.projects?.title,
          groupId: sub.group_id,
          groupName: sub.course_groups?.group_name,
          submittedBy: sub.studentaccounts ? {
            id: sub.studentaccounts.id,
            firstName: sub.studentaccounts.first_name,
            lastName: sub.studentaccounts.last_name,
            studentNumber: sub.studentaccounts.student_number,
            profileImage: sub.studentaccounts.profile_image_url
          } : null,
          submittedAt: sub.submitted_at,
          files: parseJSONField(sub.files),
          submissionText: sub.submission_text,
          status: sub.status,
          grade: sub.grade,
          maxGrade: sub.max_grade,
          gradedBy: sub.professoraccounts ? {
            id: sub.professoraccounts.id,
            firstName: sub.professoraccounts.first_name,
            lastName: sub.professoraccounts.last_name
          } : null,
          gradedAt: sub.graded_at,
          instructorFeedback: sub.instructor_feedback,
          isResubmission: sub.is_resubmission,
          resubmissionNumber: sub.resubmission_number,
          originalSubmissionId: sub.original_submission_id,
          projectSnapshot: (() => {
            const snapshot = projectSnapshot || {};
            return {
              ...snapshot,
              title: snapshot.title || sub.projects?.title,
              name: snapshot.name || sub.projects?.title,
              projectName: snapshot.projectName || sub.projects?.title,
              MAXATTEMPT: snapshot.MAXATTEMPT || snapshot.max_attempts
            };
          })(),
          memberTasks: parseJSONField(sub.member_tasks),
          evaluationSubmissions: parseJSONField(sub.evaluation_submissions),
          memberInclusions: parseJSONField(sub.member_inclusions),
          validationResults: parseJSONField(sub.validation_results),
          phaseDeliverables: parseJSONField(sub.phase_deliverables)
        };
      });

      // Log formatted phase submission to debug resubmission fields
      if (formattedPhaseSubmissions && formattedPhaseSubmissions.length > 0) {
        console.log('[Grade Submissions] First formatted phase submission:', {
          id: formattedPhaseSubmissions[0].id,
          isResubmission: formattedPhaseSubmissions[0].isResubmission,
          resubmissionNumber: formattedPhaseSubmissions[0].resubmissionNumber,
          originalSubmissionId: formattedPhaseSubmissions[0].originalSubmissionId
        });
      }

      // Fetch rubric data for phase submissions
      const phaseSubmissionsWithRubrics = await Promise.all(
        formattedPhaseSubmissions.map(async (submission) => {
          const rubricData = await fetchPhaseRubricData(submission.phaseId, freshSupabase);
          return {
            ...submission,
            rubricData
          };
        })
      );

      // Fetch rubric data for project submissions
      const projectSubmissionsWithRubrics = await Promise.all(
        formattedProjectSubmissions.map(async (submission) => {
          const rubricData = await fetchProjectRubricData(submission.projectId, freshSupabase);
          return {
            ...submission,
            rubricData
          };
        })
      );

      return res.json({
        phaseSubmissions: phaseSubmissionsWithRubrics,
        projectSubmissions: projectSubmissionsWithRubrics,
        totalSubmissions: phaseSubmissionsWithRubrics.length + projectSubmissionsWithRubrics.length
      });
    } catch (error) {
      console.error('Error in all-submissions route:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get submissions for a specific project
  // Get all submissions for a course (from ALL projects)
  router.get('/courses/:courseId/all-submissions', verifyProfessor, async (req, res) => {
    try {
      const { courseId } = req.params;
      const freshSupabase = getFreshSupabaseClient();

      console.log(`[Grade Submissions] Fetching ALL submissions for course: ${courseId}, Professor: ${req.professorId}`);

      // Verify professor owns the course
      const { data: course, error: courseError } = await freshSupabase
        .from('courses')
        .select('id, professor_id')
        .eq('id', courseId)
        .single();

      if (courseError) {
        console.error(`[Grade Submissions] Course lookup error:`, courseError);
        return res.status(500).json({ error: 'Failed to fetch course', details: courseError.message });
      }

      if (!course) {
        console.log(`[Grade Submissions] Course not found: ${courseId}`);
        return res.status(404).json({ error: 'Course not found' });
      }

      if (course.professor_id !== req.professorId) {
        console.log(`[Grade Submissions] Access denied. Expected professor ${course.professor_id}, got ${req.professorId}`);
        return res.status(403).json({ error: 'Access denied - not the course professor' });
      }

      // Get all projects for this course
      const { data: projects, error: projectsError } = await freshSupabase
        .from('projects')
        .select('id')
        .eq('course_id', courseId);

      if (projectsError) {
        console.error('Error fetching projects:', projectsError);
        return res.status(500).json({ error: 'Failed to fetch projects' });
      }

      const projectIds = projects.map(p => p.id);
      console.log(`[Grade Submissions] Found ${projectIds.length} projects in course ${courseId}`);

      if (projectIds.length === 0) {
        return res.json({ phaseSubmissions: [], projectSubmissions: [] });
      }

      // Get phase submissions for all projects
      const { data: phaseSubmissions, error: phaseError } = await freshSupabase
        .from('phase_deliverable_submissions')
        .select(`
          *,
          projects(id, title, min_tasks_per_member, max_tasks_per_member),
          project_phases(id, phase_number, title, end_date, rubric, rubric_file_url),
          course_groups(id, group_name),
          studentaccounts!phase_deliverable_submissions_submitted_by_fkey(
            id, first_name, last_name, student_number, profile_image_url
          ),
          professoraccounts!phase_deliverable_submissions_graded_by_fkey(
            id, first_name, last_name
          )
        `)
        .in('project_id', projectIds)
        .order('submitted_at', { ascending: false });

      if (phaseError) {
        console.error('Error fetching phase submissions:', phaseError);
        return res.status(500).json({ error: 'Failed to fetch phase submissions' });
      }

      // Get project submissions for all projects
      const { data: projectSubmissions, error: projectSubmissionError } = await freshSupabase
        .from('project_deliverable_submissions')
        .select(`
          *,
          projects(id, title, MAXATTEMPT),
          course_groups(id, group_name),
          studentaccounts!project_deliverable_submissions_submitted_by_fkey(
            id, first_name, last_name, student_number, profile_image_url
          ),
          professoraccounts!project_deliverable_submissions_graded_by_fkey(
            id, first_name, last_name
          )
        `)
        .in('project_id', projectIds)
        .order('submitted_at', { ascending: false });

      if (projectSubmissionError) {
        console.error('Error fetching project submissions:', projectSubmissionError);
        return res.status(500).json({ error: 'Failed to fetch project submissions' });
      }

      console.log(`[Grade Submissions] Found ${phaseSubmissions?.length || 0} phase submissions and ${projectSubmissions?.length || 0} project submissions`);

      // Format submissions (same logic as single project endpoint)
      const formattedPhaseSubmissions = (phaseSubmissions || []).map(sub => ({
        id: sub.id,
        type: 'phase',
        projectId: sub.project_id,
        phaseId: sub.phase_id,
        phaseNumber: sub.project_phases?.phase_number,
        phaseTitle: sub.project_phases?.title,
        groupId: sub.group_id,
        groupName: sub.course_groups?.group_name,
        submittedBy: sub.studentaccounts ? {
          id: sub.studentaccounts.id,
          firstName: sub.studentaccounts.first_name,
          lastName: sub.studentaccounts.last_name,
          studentNumber: sub.studentaccounts.student_number,
          profileImage: sub.studentaccounts.profile_image_url
        } : null,
        submittedAt: sub.submitted_at,
        files: parseJSONField(sub.files),
        submissionText: sub.submission_text,
        status: sub.status,
        grade: sub.grade,
        maxGrade: sub.max_grade,
        gradedBy: sub.professoraccounts ? {
          id: sub.professoraccounts.id,
          firstName: sub.professoraccounts.first_name,
          lastName: sub.professoraccounts.last_name
        } : null,
        gradedAt: sub.graded_at,
        instructorFeedback: sub.instructor_feedback,
        isResubmission: sub.is_resubmission,
        resubmissionNumber: sub.resubmission_number,
        originalSubmissionId: sub.original_submission_id,
        phaseSnapshot: (() => {
          const snapshot = parseJSONField(sub.phase_snapshot) || {};
          return {
            ...snapshot,
            projectTitle: snapshot.projectTitle || sub.projects?.title,
            phaseNumber: snapshot.phaseNumber || sub.project_phases?.phase_number,
            title: snapshot.title || sub.project_phases?.title,
            end_date: snapshot.end_date || sub.project_phases?.end_date,
            min_tasks_per_member: snapshot.min_tasks_per_member !== undefined ? snapshot.min_tasks_per_member : sub.projects?.min_tasks_per_member,
            max_tasks_per_member: snapshot.max_tasks_per_member !== undefined ? snapshot.max_tasks_per_member : sub.projects?.max_tasks_per_member,
            rubric: snapshot.rubric || sub.project_phases?.rubric || null,
            rubric_file_url: snapshot.rubric_file_url || sub.project_phases?.rubric_file_url || null
          };
        })(),
        memberTasks: parseJSONField(sub.member_tasks),
        evaluationSubmissions: parseJSONField(sub.evaluation_submissions),
        memberInclusions: parseJSONField(sub.member_inclusions),
        validationResults: parseJSONField(sub.validation_results)
      }));

      const formattedProjectSubmissions = (projectSubmissions || []).map(sub => {
        const projectSnapshot = parseJSONField(sub.project_snapshot) || {};
        
        if (!projectSnapshot.MAXATTEMPT && !projectSnapshot.max_attempts) {
          const projectsObj = Array.isArray(sub.projects) ? sub.projects[0] : sub.projects;
          const maxAttemptValue = projectsObj?.MAXATTEMPT ?? 
                                  projectsObj?.maxattempt ??
                                  projectsObj?.max_attempts ??
                                  projectsObj?.maxAttempts;
          
          if (maxAttemptValue !== null && maxAttemptValue !== undefined) {
            projectSnapshot.MAXATTEMPT = maxAttemptValue;
          }
        }
        
        return {
          id: sub.id,
          type: 'project',
          projectId: sub.project_id,
          groupId: sub.group_id,
          groupName: sub.course_groups?.group_name,
          submittedBy: sub.studentaccounts ? {
            id: sub.studentaccounts.id,
            firstName: sub.studentaccounts.first_name,
            lastName: sub.studentaccounts.last_name,
            studentNumber: sub.studentaccounts.student_number,
            profileImage: sub.studentaccounts.profile_image_url
          } : null,
          submittedAt: sub.submitted_at,
          files: parseJSONField(sub.files),
          submissionText: sub.submission_text,
          status: sub.status,
          grade: sub.grade,
          maxGrade: sub.max_grade,
          gradedBy: sub.professoraccounts ? {
            id: sub.professoraccounts.id,
            firstName: sub.professoraccounts.first_name,
            lastName: sub.professoraccounts.last_name
          } : null,
          gradedAt: sub.graded_at,
          instructorFeedback: sub.instructor_feedback,
          isResubmission: sub.is_resubmission,
          resubmissionNumber: sub.resubmission_number,
          originalSubmissionId: sub.original_submission_id,
          projectSnapshot: (() => {
            const snapshot = projectSnapshot || {};
            return {
              ...snapshot,
              title: snapshot.title || sub.projects?.title,
              name: snapshot.name || sub.projects?.title,
              projectName: snapshot.projectName || sub.projects?.title,
              MAXATTEMPT: snapshot.MAXATTEMPT || snapshot.max_attempts
            };
          })(),
          memberTasks: parseJSONField(sub.member_tasks),
          evaluationSubmissions: parseJSONField(sub.evaluation_submissions),
          memberInclusions: parseJSONField(sub.member_inclusions),
          validationResults: parseJSONField(sub.validation_results),
          phaseDeliverables: parseJSONField(sub.phase_deliverables)
        };
      });

      // Fetch rubric data for phase submissions
      const phaseSubmissionsWithRubrics = await Promise.all(
        formattedPhaseSubmissions.map(async (submission) => {
          const rubricData = await fetchPhaseRubricData(submission.phaseId, freshSupabase);
          return {
            ...submission,
            rubricData
          };
        })
      );

      // Fetch rubric data for project submissions
      const projectSubmissionsWithRubrics = await Promise.all(
        formattedProjectSubmissions.map(async (submission) => {
          const rubricData = await fetchProjectRubricData(submission.projectId, freshSupabase);
          return {
            ...submission,
            rubricData
          };
        })
      );

      res.json({
        phaseSubmissions: phaseSubmissionsWithRubrics,
        projectSubmissions: projectSubmissionsWithRubrics
      });
    } catch (error) {
      console.error('[Grade Submissions] Error fetching all submissions:', error);
      res.status(500).json({ error: 'Internal server error', details: error.message });
    }
  });

  router.get('/projects/:projectId/submissions', verifyProfessor, async (req, res) => {
    try {
      const { projectId } = req.params;
      const freshSupabase = getFreshSupabaseClient();

      console.log(`[Grade Submissions] Fetching submissions for project: ${projectId}, Professor: ${req.professorId}`);

      // Verify professor owns the project's course
      const { data: project, error: projectError } = await freshSupabase
        .from('projects')
        .select('*, courses(id, professor_id)')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error(`[Grade Submissions] Project lookup error:`, projectError);
        return res.status(500).json({ error: 'Failed to fetch project', details: projectError.message });
      }

      if (!project) {
        console.log(`[Grade Submissions] Project not found: ${projectId}`);
        return res.status(404).json({ error: 'Project not found' });
      }

      if (!project.courses || project.courses.professor_id !== req.professorId) {
        console.log(`[Grade Submissions] Access denied. Expected professor ${project.courses?.professor_id}, got ${req.professorId}`);
        return res.status(403).json({ error: 'Access denied - not the course professor' });
      }

      // Get phase submissions
      const { data: phaseSubmissions, error: phaseError } = await freshSupabase
        .from('phase_deliverable_submissions')
        .select(`
          *,
          projects(id, title, min_tasks_per_member, max_tasks_per_member),
          project_phases(id, phase_number, title, end_date, rubric, rubric_file_url),
          course_groups(id, group_name),
          studentaccounts!phase_deliverable_submissions_submitted_by_fkey(
            id, first_name, last_name, student_number, profile_image_url
          ),
          professoraccounts!phase_deliverable_submissions_graded_by_fkey(
            id, first_name, last_name
          )
        `)
        .eq('project_id', projectId)
        .order('submitted_at', { ascending: false });

      if (phaseError) {
        console.error('Error fetching phase submissions:', phaseError);
        return res.status(500).json({ error: 'Failed to fetch phase submissions' });
      }

      // Get project submissions
      const { data: projectSubmissions, error: projectSubmissionError } = await freshSupabase
        .from('project_deliverable_submissions')
        .select(`
          *,
          projects(id, title, MAXATTEMPT),
          course_groups(id, group_name),
          studentaccounts!project_deliverable_submissions_submitted_by_fkey(
            id, first_name, last_name, student_number, profile_image_url
          ),
          professoraccounts!project_deliverable_submissions_graded_by_fkey(
            id, first_name, last_name
          )
        `)
        .eq('project_id', projectId)
        .order('submitted_at', { ascending: false });

      if (projectSubmissionError) {
        console.error('Error fetching project submissions:', projectSubmissionError);
        return res.status(500).json({ error: 'Failed to fetch project submissions' });
      }

      // Format submissions similar to above
      const formattedPhaseSubmissions = (phaseSubmissions || []).map(sub => ({
        id: sub.id,
        type: 'phase',
        projectId: sub.project_id,
        phaseId: sub.phase_id,
        phaseNumber: sub.project_phases?.phase_number,
        phaseTitle: sub.project_phases?.title,
        groupId: sub.group_id,
        groupName: sub.course_groups?.group_name,
        submittedBy: sub.studentaccounts ? {
          id: sub.studentaccounts.id,
          firstName: sub.studentaccounts.first_name,
          lastName: sub.studentaccounts.last_name,
          studentNumber: sub.studentaccounts.student_number,
          profileImage: sub.studentaccounts.profile_image_url
        } : null,
        submittedAt: sub.submitted_at,
        files: parseJSONField(sub.files),
        submissionText: sub.submission_text,
        status: sub.status,
        grade: sub.grade,
        maxGrade: sub.max_grade,
        gradedBy: sub.professoraccounts ? {
          id: sub.professoraccounts.id,
          firstName: sub.professoraccounts.first_name,
          lastName: sub.professoraccounts.last_name
        } : null,
        gradedAt: sub.graded_at,
        instructorFeedback: sub.instructor_feedback,
        isResubmission: sub.is_resubmission,
        resubmissionNumber: sub.resubmission_number,
        originalSubmissionId: sub.original_submission_id,
        phaseSnapshot: (() => {
          const snapshot = parseJSONField(sub.phase_snapshot) || {};
          return {
            ...snapshot,
            projectTitle: snapshot.projectTitle || sub.projects?.title,
            phaseNumber: snapshot.phaseNumber || sub.project_phases?.phase_number,
            title: snapshot.title || sub.project_phases?.title,
            end_date: snapshot.end_date || sub.project_phases?.end_date,
            min_tasks_per_member: snapshot.min_tasks_per_member !== undefined ? snapshot.min_tasks_per_member : sub.projects?.min_tasks_per_member,
            max_tasks_per_member: snapshot.max_tasks_per_member !== undefined ? snapshot.max_tasks_per_member : sub.projects?.max_tasks_per_member,
            rubric: snapshot.rubric || sub.project_phases?.rubric || null,
            rubric_file_url: snapshot.rubric_file_url || sub.project_phases?.rubric_file_url || null
          };
        })(),
        memberTasks: parseJSONField(sub.member_tasks),
        evaluationSubmissions: parseJSONField(sub.evaluation_submissions),
        memberInclusions: parseJSONField(sub.member_inclusions),
        validationResults: parseJSONField(sub.validation_results)
      }));

      const formattedProjectSubmissions = (projectSubmissions || []).map(sub => {
        const projectSnapshot = parseJSONField(sub.project_snapshot) || {};
        
        // If MAXATTEMPT is missing from snapshot, use it from the joined projects table
        // Try multiple possible property names (PostgreSQL/Supabase may normalize casing)
        if (!projectSnapshot.MAXATTEMPT && !projectSnapshot.max_attempts) {
          // Handle both object and array formats
          const projectsObj = Array.isArray(sub.projects) ? sub.projects[0] : sub.projects;
          
          // Try all possible property name variations
          const maxAttemptValue = projectsObj?.MAXATTEMPT ?? 
                                  projectsObj?.maxattempt ??
                                  projectsObj?.max_attempts ??
                                  projectsObj?.maxAttempts;
          
          if (maxAttemptValue !== null && maxAttemptValue !== undefined) {
            projectSnapshot.MAXATTEMPT = maxAttemptValue;
            console.log(`[Grade Submissions] ✅ Added MAXATTEMPT from projects join for project ${sub.project_id}: ${maxAttemptValue}`);
          } else {
            const availableKeys = projectsObj ? Object.keys(projectsObj) : [];
            console.log(`[Grade Submissions] ❌ MAXATTEMPT not found for project ${sub.project_id}. Available keys:`, availableKeys);
            console.log(`[Grade Submissions] Full projects object:`, JSON.stringify(projectsObj, null, 2));
          }
        } else {
          console.log(`[Grade Submissions] ✅ MAXATTEMPT already in snapshot for project ${sub.project_id}: ${projectSnapshot.MAXATTEMPT || projectSnapshot.max_attempts}`);
        }
        
        return {
          id: sub.id,
          type: 'project',
          projectId: sub.project_id,
          groupId: sub.group_id,
          groupName: sub.course_groups?.group_name,
          submittedBy: sub.studentaccounts ? {
            id: sub.studentaccounts.id,
            firstName: sub.studentaccounts.first_name,
            lastName: sub.studentaccounts.last_name,
            studentNumber: sub.studentaccounts.student_number,
            profileImage: sub.studentaccounts.profile_image_url
          } : null,
          submittedAt: sub.submitted_at,
          files: parseJSONField(sub.files),
          submissionText: sub.submission_text,
          status: sub.status,
          grade: sub.grade,
          maxGrade: sub.max_grade,
          gradedBy: sub.professoraccounts ? {
            id: sub.professoraccounts.id,
            firstName: sub.professoraccounts.first_name,
            lastName: sub.professoraccounts.last_name
          } : null,
          gradedAt: sub.graded_at,
          instructorFeedback: sub.instructor_feedback,
          isResubmission: sub.is_resubmission,
          resubmissionNumber: sub.resubmission_number,
          originalSubmissionId: sub.original_submission_id,
          projectSnapshot: projectSnapshot,
          memberTasks: parseJSONField(sub.member_tasks),
          evaluationSubmissions: parseJSONField(sub.evaluation_submissions),
          memberInclusions: parseJSONField(sub.member_inclusions),
          validationResults: parseJSONField(sub.validation_results),
          phaseDeliverables: parseJSONField(sub.phase_deliverables)
        };
      });

      // Fetch rubric data for phase submissions
      const phaseSubmissionsWithRubrics = await Promise.all(
        formattedPhaseSubmissions.map(async (submission) => {
          const rubricData = await fetchPhaseRubricData(submission.phaseId, freshSupabase);
          return {
            ...submission,
            rubricData
          };
        })
      );

      // Fetch rubric data for project submissions
      const projectSubmissionsWithRubrics = await Promise.all(
        formattedProjectSubmissions.map(async (submission) => {
          const rubricData = await fetchProjectRubricData(submission.projectId, freshSupabase);
          return {
            ...submission,
            rubricData
          };
        })
      );

      return res.json({
        project: {
          id: project.id,
          title: project.title
        },
        phaseSubmissions: phaseSubmissionsWithRubrics,
        projectSubmissions: projectSubmissionsWithRubrics
      });
    } catch (error) {
      console.error('Error in project submissions route:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Grade a phase submission
  router.post('/phase-submissions/:submissionId/grade', verifyProfessor, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { grade, feedback, memberGrades } = req.body;
      const freshSupabase = getFreshSupabaseClient();

      // Validate input
      if (grade === undefined || grade === null) {
        return res.status(400).json({ error: 'Grade is required' });
      }

      // Get submission to verify access
      const { data: submission, error: fetchError } = await freshSupabase
        .from('phase_deliverable_submissions')
        .select('*, projects(id, course_id, courses(id, professor_id))')
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      if (!submission.projects?.courses?.professor_id || submission.projects.courses.professor_id !== req.professorId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update the submission
      const { data: updated, error: updateError } = await freshSupabase
        .from('phase_deliverable_submissions')
        .update({
          grade: parseFloat(grade),
          instructor_feedback: feedback || null,
          graded_by: req.professorId,
          graded_at: new Date().toISOString(),
          status: 'graded'
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating submission:', updateError);
        return res.status(500).json({ error: 'Failed to save grade' });
      }

      // If memberGrades provided, update individual member grades in member_tasks JSONB
      if (memberGrades && typeof memberGrades === 'object' && Object.keys(memberGrades).length > 0) {
        console.log('💯 Updating member grades:', memberGrades);
        
        // Get current member_tasks (it's an array format)
        let currentMemberTasks = parseJSONField(submission.member_tasks);
        
        // Check if it's array format or object format
        if (Array.isArray(currentMemberTasks)) {
          // Array format: [{member_id: xxx, ...}, ...]
          currentMemberTasks = currentMemberTasks.map(member => {
            const memberId = member.member_id;
            if (memberGrades[memberId]) {
              return {
                ...member,
                individual_grade: memberGrades[memberId].grade,
                individual_feedback: memberGrades[memberId].feedback || null,
                graded_at: new Date().toISOString()
              };
            }
            return member;
          });
        } else {
          // Object format: {member-id: {...}, ...}
          currentMemberTasks = currentMemberTasks || {};
          Object.keys(memberGrades).forEach(memberId => {
            if (!currentMemberTasks[memberId]) {
              currentMemberTasks[memberId] = {};
            }
            currentMemberTasks[memberId].individual_grade = memberGrades[memberId].grade;
            currentMemberTasks[memberId].individual_feedback = memberGrades[memberId].feedback || null;
            currentMemberTasks[memberId].graded_at = new Date().toISOString();
          });
        }
        
        // Update member_tasks in database
        const { error: memberGradeError } = await freshSupabase
          .from('phase_deliverable_submissions')
          .update({
            member_tasks: currentMemberTasks
          })
          .eq('id', submissionId);
        
        if (memberGradeError) {
          console.error('Error updating member grades:', memberGradeError);
        } else {
          console.log('✅ Member grades updated successfully');
        }
      }

      return res.json({
        success: true,
        submission: updated
      });
    } catch (error) {
      console.error('Error grading phase submission:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Grade a project submission
  router.post('/project-submissions/:submissionId/grade', verifyProfessor, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { grade, feedback, memberGrades } = req.body;
      const freshSupabase = getFreshSupabaseClient();

      // Validate input
      if (grade === undefined || grade === null) {
        return res.status(400).json({ error: 'Grade is required' });
      }

      // Get submission to verify access
      const { data: submission, error: fetchError } = await freshSupabase
        .from('project_deliverable_submissions')
        .select('*, projects(id, course_id, courses(id, professor_id))')
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      if (!submission.projects?.courses?.professor_id || submission.projects.courses.professor_id !== req.professorId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update the submission
      const { data: updated, error: updateError } = await freshSupabase
        .from('project_deliverable_submissions')
        .update({
          grade: parseFloat(grade),
          instructor_feedback: feedback || null,
          graded_by: req.professorId,
          graded_at: new Date().toISOString(),
          status: 'graded'
        })
        .eq('id', submissionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating submission:', updateError);
        return res.status(500).json({ error: 'Failed to save grade' });
      }

      // If memberGrades provided, update individual member grades in member_tasks JSONB
      if (memberGrades && typeof memberGrades === 'object' && Object.keys(memberGrades).length > 0) {
        console.log('💯 Updating member grades:', memberGrades);
        
        // Get current member_tasks (it's an array format)
        let currentMemberTasks = parseJSONField(submission.member_tasks);
        
        // Check if it's array format or object format
        if (Array.isArray(currentMemberTasks)) {
          // Array format: [{member_id: xxx, ...}, ...]
          currentMemberTasks = currentMemberTasks.map(member => {
            const memberId = member.member_id;
            if (memberGrades[memberId]) {
              return {
                ...member,
                individual_grade: memberGrades[memberId].grade,
                individual_feedback: memberGrades[memberId].feedback || null,
                graded_at: new Date().toISOString()
              };
            }
            return member;
          });
        } else {
          // Object format: {member-id: {...}, ...}
          currentMemberTasks = currentMemberTasks || {};
          Object.keys(memberGrades).forEach(memberId => {
            if (!currentMemberTasks[memberId]) {
              currentMemberTasks[memberId] = {};
            }
            currentMemberTasks[memberId].individual_grade = memberGrades[memberId].grade;
            currentMemberTasks[memberId].individual_feedback = memberGrades[memberId].feedback || null;
            currentMemberTasks[memberId].graded_at = new Date().toISOString();
          });
        }
        
        // Update member_tasks in database
        const { error: memberGradeError } = await freshSupabase
          .from('project_deliverable_submissions')
          .update({
            member_tasks: currentMemberTasks
          })
          .eq('id', submissionId);
        
        if (memberGradeError) {
          console.error('Error updating member grades:', memberGradeError);
        } else {
          console.log('✅ Member grades updated successfully');
        }
      }

      return res.json({
        success: true,
        submission: updated
      });
    } catch (error) {
      console.error('Error grading project submission:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Update member inclusion status
  router.post('/submissions/:submissionId/member-inclusion', verifyProfessor, async (req, res) => {
    try {
      const { submissionId } = req.params;
      const { type, memberId, included, reason } = req.body; // type: 'phase' or 'project'
      const freshSupabase = getFreshSupabaseClient();

      if (!type || !memberId || included === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const tableName = type === 'phase' ? 'phase_deliverable_submissions' : 'project_deliverable_submissions';

      // Get submission
      const { data: submission, error: fetchError } = await freshSupabase
        .from(tableName)
        .select('*, projects(id, course_id, courses(id, professor_id))')
        .eq('id', submissionId)
        .single();

      if (fetchError || !submission) {
        return res.status(404).json({ error: 'Submission not found' });
      }

      if (!submission.projects?.courses?.professor_id || submission.projects.courses.professor_id !== req.professorId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update member_inclusions JSONB
      let memberInclusions = submission.member_inclusions || [];
      const memberIndex = memberInclusions.findIndex(m => m.member_id === memberId);

      if (memberIndex !== -1) {
        memberInclusions[memberIndex].included = included;
        memberInclusions[memberIndex].exclusion_reason = included ? null : (reason || '');
      } else {
        memberInclusions.push({
          member_id: memberId,
          included: included,
          exclusion_reason: included ? null : (reason || '')
        });
      }

      // Update submission
      const { data: updated, error: updateError } = await freshSupabase
        .from(tableName)
        .update({ member_inclusions: memberInclusions })
        .eq('id', submissionId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating member inclusion:', updateError);
        return res.status(500).json({ error: 'Failed to update member inclusion' });
      }

      return res.json({
        success: true,
        submission: updated
      });
    } catch (error) {
      console.error('Error updating member inclusion:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
};
