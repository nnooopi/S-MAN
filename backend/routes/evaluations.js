const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * GET /api/evaluations/student/:studentId
 * Fetch all evaluations for a student across all projects
 * Query params:
 * - type: 'phase' or 'project'
 * - view: 'received' or 'given'
 */
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { type = 'phase', view = 'received' } = req.query;

    console.log(`Fetching ${view} ${type} evaluations for student: ${studentId}`);

    // Validate parameters
    if (!['phase', 'project'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be "phase" or "project"' });
    }
    if (!['received', 'given'].includes(view)) {
      return res.status(400).json({ error: 'Invalid view. Must be "received" or "given"' });
    }

    let evaluations = [];

    if (type === 'phase') {
      evaluations = await getPhaseEvaluations(studentId, view);
    } else {
      evaluations = await getProjectEvaluations(studentId, view);
    }

    console.log(`✅ [EVALUATIONS] Returning ${evaluations.length} ${view} ${type} evaluations`);
    if (evaluations.length > 0) {
      console.log(`📊 [EVALUATIONS] First evaluation:`, JSON.stringify(evaluations[0], null, 2));
    }

    res.json({
      success: true,
      data: evaluations,
      count: evaluations.length
    });

  } catch (error) {
    console.error('Error fetching evaluations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch evaluations',
      message: error.message 
    });
  }
});

/**
 * Get phase evaluations for a student
 */
async function getPhaseEvaluations(studentId, view) {
  try {
    // First, get all groups the student is a member of
    const { data: groupMemberships, error: groupError } = await supabase
      .from('course_group_members')
      .select('id, student_id, group_id, course_groups(id, group_name, course_id)')
      .eq('student_id', studentId);

    if (groupError) throw groupError;

    const groupIds = groupMemberships.map(m => m.group_id);
    const memberIds = groupMemberships.map(m => m.id); // IDs to use for looking up evaluated_members

    if (groupIds.length === 0) {
      return [];
    }

    let query = supabase
      .from('phase_evaluation_submissions')
      .select(`
        id,
        project_id,
        phase_id,
        phase_evaluation_form_id,
        group_id,
        evaluator_id,
        evaluation_data,
        is_custom_evaluation,
        file_submission_url,
        file_name,
        status,
        submission_date,
        created_at,
        projects(id, title, course_id),
        project_phases(id, title, phase_number),
        course_groups(id, group_name),
        studentaccounts!phase_evaluation_submissions_evaluator_id_fkey(id, first_name, last_name, student_number, profile_image_url),
        phase_evaluation_forms(is_custom_evaluation)
      `)
      .in('group_id', groupIds)
      .eq('status', 'submitted')
      .order('submission_date', { ascending: false });

    if (view === 'given') {
      // Get evaluations where the student is the evaluator
      query = query.eq('evaluator_id', studentId);
    } else {
      // Get evaluations where the student was evaluated (received)
      // We need to check if student is in the evaluation_data.evaluated_members
      // Since we can't filter JSONB keys directly in the query, we'll fetch all group evaluations
      // and filter on the application side
    }

    const { data: submissions, error: submissionError } = await query;

    if (submissionError) {
      console.error(`❌ [SUBMISSION ERROR]:`, submissionError);
      throw submissionError;
    }

    console.log(`✅ [SUBMISSIONS FETCHED] Found: ${submissions?.length || 0} submissions`);

    // For each submission, fetch its rubric criteria
    const submissionsWithRubrics = await Promise.all(submissions.map(async (submission) => {
      let rubricCriteria = [];
      
      // Use the form ID directly from the submission
      if (submission.phase_evaluation_form_id) {
        try {
          const { data: criteria, error: criteriaError } = await supabase
            .from('phase_evaluation_criteria')
            .select('id, name, description, max_points')
            .eq('phase_evaluation_form_id', submission.phase_evaluation_form_id)
            .order('order_index', { ascending: true });
          
          if (criteriaError) {
            console.error(`❌ [CRITERIA ERROR] Form: ${submission.phase_evaluation_form_id}:`, criteriaError);
          } else {
            console.log(`🔍 [CRITERIA] Form: ${submission.phase_evaluation_form_id}, Found: ${criteria?.length || 0} criteria`);
          }
          
          rubricCriteria = criteria || [];
        } catch (err) {
          console.error(`❌ [CRITERIA FETCH ERROR]:`, err);
        }
      } else {
        console.warn(`⚠️ [NO FORM ID] Submission: ${submission.id}`);
      }
      
      return { ...submission, rubricCriteria };
    }));

    // Fetch all unique student IDs from evaluated members to get their names
    const allEvaluatedStudentIds = new Set();
    submissionsWithRubrics.forEach(sub => {
      // Parse evaluation_data if it's a string
      let evaluationData = sub.evaluation_data;
      if (typeof evaluationData === 'string') {
        try {
          evaluationData = JSON.parse(evaluationData);
        } catch (e) {
          console.error(`❌ Failed to parse evaluation_data for submission ${sub.id}:`, e.message);
          evaluationData = {};
        }
      }
      
      const evaluatedMembers = evaluationData?.evaluated_members || {};
      Object.keys(evaluatedMembers).forEach(id => allEvaluatedStudentIds.add(id));
    });

    console.log(`👥 [UNIQUE STUDENTS] Found: ${allEvaluatedStudentIds.size} unique evaluated members`);

    const studentInfoMap = {};
    if (allEvaluatedStudentIds.size > 0) {
      try {
        const { data: studentAccounts, error: studentError } = await supabase
          .from('studentaccounts')
          .select('id, first_name, last_name')
          .in('id', Array.from(allEvaluatedStudentIds));
        
        if (studentError) {
          console.error(`❌ [STUDENT FETCH ERROR]:`, studentError);
        } else {
          console.log(`✅ [STUDENTS FETCHED] Found: ${studentAccounts?.length || 0} students`);
        }
        
        if (studentAccounts) {
          studentAccounts.forEach(student => {
            studentInfoMap[student.id] = `${student.first_name} ${student.last_name}`;
          });
        }
      } catch (err) {
        console.error(`❌ [STUDENT ERROR]:`, err);
      }
    }

    // Process and format the data
    let evaluations = submissionsWithRubrics.map(submission => {
      // Parse evaluation_data if it's a string
      let evaluationData = submission.evaluation_data;
      if (typeof evaluationData === 'string') {
        try {
          evaluationData = JSON.parse(evaluationData);
        } catch (e) {
          console.error(`❌ Failed to parse evaluation_data for submission ${submission.id}:`, e.message);
          evaluationData = {};
        }
      }
      if (!evaluationData) {
        evaluationData = {};
      }
      
      const evaluatedMembers = evaluationData.evaluated_members || {};
      const rubricCriteria = submission.rubricCriteria || [];

      const criteriaMap = {};
      
      // Build a map of criterion UUID to criterion name from rubric criteria
      if (Array.isArray(rubricCriteria)) {
        rubricCriteria.forEach(criterion => {
          if (criterion.id && criterion.name) {
            criteriaMap[criterion.id] = criterion.name;
          }
        });
      }
      
      // IMPORTANT: Also check all evaluated members' criteria to catch any missing mappings
      // This handles cases where criteria might come from different sources
      Object.values(evaluatedMembers).forEach(memberEvals => {
        if (memberEvals && memberEvals.criteria && typeof memberEvals.criteria === 'object') {
          Object.keys(memberEvals.criteria).forEach(criterionId => {
            // If this criterion ID is not already in our map, we need to find it
            if (!criteriaMap[criterionId]) {
              console.warn(`⚠️ [MISSING CRITERION] ID: ${criterionId} not found in rubric criteria`);
            }
          });
        }
      });

      // Helper function to transform criteria scores
      const transformCriteria = (criteriaObj) => {
        if (!criteriaObj) return {};
        const transformed = {};
        Object.entries(criteriaObj).forEach(([key, value]) => {
          const name = criteriaMap[key] || key; // Use mapped name or fallback to UUID
          transformed[name] = value;
        });
        console.log(`🔄 [CRITERIA TRANSFORM] Original keys: ${Object.keys(criteriaObj).join(', ')}`);
        console.log(`🔄 [CRITERIA MAP] ${JSON.stringify(criteriaMap)}`);
        console.log(`🔄 [TRANSFORMED] ${JSON.stringify(transformed)}`);
        return transformed;
      };

      // Determine evaluation type
      const isFormCustom = submission.phase_evaluation_forms?.is_custom_evaluation === true || 
                           submission.phase_evaluation_forms?.is_custom_evaluation === 'true';
      const isSubmissionCustom = submission.is_custom_evaluation === true || 
                                 submission.is_custom_evaluation === 'true';
      const isBothCustom = isFormCustom && isSubmissionCustom;
      const evaluationType = isBothCustom ? 'Custom Evaluation (File Submission)' : 'Built-In Evaluation';

      // For received evaluations, check if this student was evaluated
      if (view === 'received') {
        // Handle custom file evaluations - show the evaluator who submitted
        if (isBothCustom && submission.file_submission_url) {
          // Get evaluator info (member who submitted)
          const evaluatorGroupMember = groupMemberships.find(m => m.student_id === submission.evaluator_id);
          const evaluatorMemberId = evaluatorGroupMember?.id;
          
          return {
            id: submission.id,
            type: 'phase',
            evaluationType: evaluationType,
            projectId: submission.project_id,
            projectTitle: submission.projects?.title || 'Unknown Project',
            courseId: submission.projects?.course_id,
            phaseId: submission.phase_id,
            phaseName: submission.project_phases?.title || 'Unknown Phase',
            phaseNumber: submission.project_phases?.phase_number || 0,
            groupId: submission.group_id,
            groupName: submission.course_groups?.group_name || 'Unknown Group',
            submissionDate: submission.submission_date,
            createdAt: submission.created_at,
            status: submission.status,
            evaluatorName: null, // Anonymized
            evaluatorId: submission.evaluator_id,
            // For custom, include the submitting member as an "evaluating member"
            evaluatedMembers: evaluatorMemberId ? [{
              studentId: submission.evaluator_id,
              studentName: `Evaluator`, // Placeholder - will be updated in batch fetch
              memberNumber: 0,
              total: null, // Custom doesn't have scores
              criteria: {},
              feedback: '',
              hasFile: true,
              fileSubmission: {
                fileName: submission.file_name,
                fileUrl: submission.file_submission_url
              },
              _needsEvaluatorInfo: true, // Flag to fetch evaluator info
              _groupId: submission.group_id
            }] : [],
            evaluatedMembersCount: evaluatorMemberId ? 1 : 0,
            scores: {
              total: 'CUSTOM FILE',
              criteria: {},
              feedback: 'Custom file evaluation submitted'
            },
            isAnonymous: true,
            isCustomEvaluation: true,
            rubricCriteria: rubricCriteria
          };
        }
        
        // For built-in evaluations - check if current student appears in evaluated_members
        const studentWasEvaluated = Object.values(evaluatedMembers).some(member => member !== null && member !== undefined);
        if (!studentWasEvaluated) {
          return null; // This evaluation doesn't include the current student
        }

        // Build single member entry for the evaluator
        // Use submission.evaluator_id to identify the evaluator
        // We need to find their course_group_members ID and member number
        
        // Find the current student's data in evaluated_members
        // NOTE: evaluated_members keys might be EITHER course_group_members IDs OR studentaccounts IDs
        // Try both approaches
        let studentData = null;
        
        // First try: course_group_members IDs (new format)
        for (const memberId of memberIds) {
          if (evaluatedMembers[memberId]) {
            studentData = evaluatedMembers[memberId];
            break;
          }
        }
        
        // Second try: studentaccounts IDs (old format)
        if (!studentData && evaluatedMembers[studentId]) {
          studentData = evaluatedMembers[studentId];
        }
        
        if (!studentData) {
          return null; // Current student not evaluated in this submission
        }

        // For now, use placeholder for evaluator info - we'll fetch it separately later
        const evaluatingMembers = [{
          studentId: submission.evaluator_id, // Store evaluator_id for now
          studentName: 'Evaluator', // Placeholder
          memberNumber: 0, // Placeholder
          total: studentData.total || 0,
          criteria: transformCriteria(studentData.criteria || {}),
          feedback: studentData.feedback || '',
          hasFile: false,
          _needsEvaluatorInfo: true, // Flag to indicate we need to fetch evaluator info
          _groupId: submission.group_id
        }];
        
        // For received, the average score is just this one evaluation
        const averageScore = studentData?.total || 0;

        // Return evaluation with evaluator listed
        return {
          id: submission.id,
          type: 'phase',
          evaluationType: evaluationType,
          projectId: submission.project_id,
          projectTitle: submission.projects?.title || 'Unknown Project',
          courseId: submission.projects?.course_id,
          phaseId: submission.phase_id,
          phaseName: submission.project_phases?.title || 'Unknown Phase',
          phaseNumber: submission.project_phases?.phase_number || 0,
          groupId: submission.group_id,
          groupName: submission.course_groups?.group_name || 'Unknown Group',
          submissionDate: submission.submission_date,
          createdAt: submission.created_at,
          status: submission.status,
          // Anonymized - no evaluator info
          evaluatorName: null,
          evaluatorId: null,
          // Show all members who evaluated me
          evaluatedMembers: evaluatingMembers,
          evaluatedMembersCount: evaluatingMembers.length,
          // Average score across all evaluators (shown in overview)
          scores: {
            total: averageScore,
            criteria: {},
            feedback: ''
          },
          isAnonymous: true,
          rubricCriteria: rubricCriteria
        };
      } else {
        // For given evaluations, show full details
        
        // Handle custom file evaluations
        if (isBothCustom && submission.file_submission_url) {
          return {
            id: submission.id,
            type: 'phase',
            evaluationType: evaluationType,
            projectId: submission.project_id,
            projectTitle: submission.projects?.title || 'Unknown Project',
            courseId: submission.projects?.course_id,
            phaseId: submission.phase_id,
            phaseName: submission.project_phases?.title || 'Unknown Phase',
            phaseNumber: submission.project_phases?.phase_number || 0,
            groupId: submission.group_id,
            groupName: submission.course_groups?.group_name || 'Unknown Group',
            submissionDate: submission.submission_date,
            createdAt: submission.created_at,
            status: submission.status,
            evaluatorName: submission.studentaccounts 
              ? `${submission.studentaccounts.first_name} ${submission.studentaccounts.last_name}`
              : 'Unknown',
            evaluatorId: submission.evaluator_id,
            evaluatedMembers: [],
            evaluatedMembersCount: 0,
            isCustomEvaluation: true,
            fileSubmission: {
              fileName: submission.file_name,
              fileUrl: submission.file_submission_url
            },
            isAnonymous: false,
            rubricCriteria: rubricCriteria
          };
        }
        
        // For built-in evaluations, show evaluated members
        return {
          id: submission.id,
          type: 'phase',
          evaluationType: evaluationType,
          projectId: submission.project_id,
          projectTitle: submission.projects?.title || 'Unknown Project',
          courseId: submission.projects?.course_id,
          phaseId: submission.phase_id,
          phaseName: submission.project_phases?.title || 'Unknown Phase',
          phaseNumber: submission.project_phases?.phase_number || 0,
          groupId: submission.group_id,
          groupName: submission.course_groups?.group_name || 'Unknown Group',
          submissionDate: submission.submission_date,
          createdAt: submission.created_at,
          status: submission.status,
          evaluatorName: submission.studentaccounts 
            ? `${submission.studentaccounts.first_name} ${submission.studentaccounts.last_name}`
            : 'Unknown',
          evaluatorId: submission.evaluator_id,
          // Include all evaluated members with transformed criteria
          evaluatedMembers: Object.keys(evaluatedMembers).map((memberId, index) => ({
            studentId: memberId,
            studentName: studentInfoMap[memberId] || `Member ${index + 1}`,
            memberNumber: index + 1,
            total: evaluatedMembers[memberId].total || 0,
            criteria: transformCriteria(evaluatedMembers[memberId].criteria),
            feedback: evaluatedMembers[memberId].feedback || ''
          })),
          aggregateTotal: evaluationData.aggregate_total || 0,
          isAnonymous: false,
          rubricCriteria: rubricCriteria
        };
      }
    }).filter(evaluation => evaluation !== null); // Remove null entries from received evaluations

    // For received evaluations, fetch evaluator information in batch
    if (view === 'received' && evaluations.length > 0) {
      // Collect all unique evaluator IDs and their group IDs
      const evaluatorQueries = [];
      evaluations.forEach(evaluation => {
        if (evaluation.evaluatedMembers) {
          evaluation.evaluatedMembers.forEach(member => {
            if (member._needsEvaluatorInfo) {
              evaluatorQueries.push({
                studentId: member.studentId,
                groupId: member._groupId
              });
            }
          });
        }
      });
      
      // Fetch all evaluator course_group_members info
      const evaluatorInfoMap = {}; // Map of studentId+groupId -> {memberId, memberNumber}
      if (evaluatorQueries.length > 0) {
        for (const query of evaluatorQueries) {
          const key = `${query.studentId}-${query.groupId}`;
          if (!evaluatorInfoMap[key]) {
            const { data: evaluatorMember } = await supabase
              .from('course_group_members')
              .select('id')
              .eq('student_id', query.studentId)
              .eq('group_id', query.groupId)
              .single();
            
            if (evaluatorMember) {
              // Get all members in this group to determine member number
              const { data: allMembers } = await supabase
                .from('course_group_members')
                .select('id')
                .eq('group_id', query.groupId)
                .order('created_at', { ascending: true });
              
              const memberIndex = allMembers ? allMembers.findIndex(m => m.id === evaluatorMember.id) : -1;
              evaluatorInfoMap[key] = {
                memberId: evaluatorMember.id,
                memberNumber: memberIndex + 1,
                memberName: `Member ${memberIndex + 1}`
              };
            }
          }
        }
      }
      
      // Update evaluations with evaluator info
      evaluations.forEach(evaluation => {
        if (evaluation.evaluatedMembers) {
          evaluation.evaluatedMembers.forEach(member => {
            if (member._needsEvaluatorInfo) {
              const key = `${member.studentId}-${member._groupId}`;
              const info = evaluatorInfoMap[key];
              if (info) {
                member.studentId = info.memberId;
                member.studentName = info.memberName;
                member.memberNumber = info.memberNumber;
              }
              delete member._needsEvaluatorInfo;
              delete member._groupId;
            }
          });
        }
      });
    }

    // For received evaluations, group by phase_id and combine evaluators
    if (view === 'received') {
      const groupedEvaluations = {};
      
      evaluations.forEach(evaluation => {
        const key = `${evaluation.phaseId}`;
        
        if (!groupedEvaluations[key]) {
          // First evaluation for this phase
          groupedEvaluations[key] = {
            ...evaluation,
            evaluatedMembers: evaluation.evaluatedMembers || [],
            scores: {
              total: evaluation.scores?.total === 'CUSTOM FILE' ? 'CUSTOM FILE' : 0,
              criteria: {},
              feedback: ''
            }
          };
        } else {
          // Add this evaluator's scores to the list
          if (evaluation.evaluatedMembers && evaluation.evaluatedMembers.length > 0) {
            groupedEvaluations[key].evaluatedMembers.push(...evaluation.evaluatedMembers);
          }
        }
      });
      
      // Calculate average scores for each grouped evaluation (only for non-custom)
      Object.values(groupedEvaluations).forEach(groupedEval => {
        if (groupedEval.scores.total !== 'CUSTOM FILE' && groupedEval.evaluatedMembers.length > 0) {
          const totalScore = groupedEval.evaluatedMembers.reduce((sum, member) => sum + (member.total || 0), 0);
          groupedEval.scores.total = Math.round(totalScore / groupedEval.evaluatedMembers.length);
          groupedEval.evaluatedMembersCount = groupedEval.evaluatedMembers.length;
        }
      });
      
      return Object.values(groupedEvaluations);
    }

    return evaluations;

  } catch (error) {
    console.error('Error in getPhaseEvaluations:', error);
    throw error;
  }
}

/**
 * Get project evaluations for a student
 */
async function getProjectEvaluations(studentId, view) {
  try {
    // First, get all groups the student is a member of
    const { data: groupMemberships, error: groupError } = await supabase
      .from('course_group_members')
      .select('id, group_id, course_groups(id, group_name, course_id)')
      .eq('student_id', studentId);

    if (groupError) throw groupError;

    const groupIds = groupMemberships.map(m => m.group_id);
    const memberIds = groupMemberships.map(m => m.id); // IDs to use for looking up evaluated_members

    if (groupIds.length === 0) {
      return [];
    }

    let query = supabase
      .from('project_evaluation_submissions')
      .select(`
        id,
        project_id,
        group_id,
        project_evaluation_form_id,
        evaluator_id,
        evaluated_member_id,
        is_custom_evaluation,
        evaluation_data,
        file_submission_url,
        file_name,
        total_score,
        status,
        submission_date,
        created_at,
        projects(id, title, course_id),
        course_groups(id, group_name),
        project_evaluation_forms(is_custom_evaluation),
        studentaccounts!project_evaluation_submissions_evaluator_id_fkey(id, first_name, last_name, student_number, profile_image_url)
      `)
      .in('group_id', groupIds)
      .eq('status', 'submitted')
      .order('submission_date', { ascending: false });

    if (view === 'given') {
      // Get evaluations where the student is the evaluator
      query = query.eq('evaluator_id', studentId);
    } else {
      // Get evaluations where the student was evaluated (received)
      // For received, check if student appears in the evaluated_members within evaluation_data
      // This requires fetching all and filtering in code since we can't query nested JSON easily
    }

    const { data: submissions, error: submissionError } = await query;

    if (submissionError) throw submissionError;

    console.log(`✅ [PROJECT SUBMISSIONS] Found: ${submissions?.length || 0} submissions`);

    // Collect all unique project_evaluation_form_ids to fetch criteria
    const formIds = [...new Set(submissions
      .map(s => s.project_evaluation_form_id)
      .filter(Boolean))];

    // Fetch criteria for all forms
    const criteriaMap = {};
    if (formIds.length > 0) {
      const { data: allCriteria, error: criteriaError } = await supabase
        .from('project_evaluation_criteria')
        .select('id, name, project_evaluation_form_id')
        .in('project_evaluation_form_id', formIds);

      if (criteriaError) {
        console.error('Error fetching project evaluation criteria:', criteriaError);
      } else {
        allCriteria.forEach(criterion => {
          if (criterion.id && criterion.name) {
            criteriaMap[criterion.id] = criterion.name;
          }
        });
        console.log(`✅ [PROJECT CRITERIA MAP] Built map with ${Object.keys(criteriaMap).length} criteria`);
      }
    }

    // Collect all unique student IDs from evaluation_data to fetch names
    const studentIds = new Set();
    console.log(`📊 [PROJECT EVALS] Processing ${submissions?.length || 0} submissions to collect student IDs`);
    submissions.forEach((submission, idx) => {
      // Parse evaluation_data if it's a string
      let evaluationData = submission.evaluation_data;
      if (typeof evaluationData === 'string') {
        try {
          evaluationData = JSON.parse(evaluationData);
        } catch (e) {
          console.error(`❌ Failed to parse evaluation_data for submission ${submission.id}:`, e.message);
          evaluationData = {};
        }
      }
      if (!evaluationData) {
        evaluationData = {};
      }
      
      console.log(`   Submission ${idx}: has evaluated_members?`, !!evaluationData.evaluated_members);
      if (evaluationData.evaluated_members && typeof evaluationData.evaluated_members === 'object') {
        const memberKeys = Object.keys(evaluationData.evaluated_members);
        console.log(`   Submission ${idx}: Found ${memberKeys.length} members (course_group_members IDs):`, memberKeys);
        memberKeys.forEach(memberId => {
          studentIds.add(memberId);
        });
      }
    });

    // Fetch student names via course_group_members join
    // The IDs in evaluated_members are course_group_members.id, not studentaccounts.id
    const studentInfoMap = {};
    console.log(`✅ [PROJECT EVALS] Total unique group member IDs collected: ${studentIds.size}`);
    console.log(`✅ [PROJECT EVALS] Group Member IDs: ${Array.from(studentIds).join(', ')}`);
    if (studentIds.size > 0) {
      console.log(`🔍 [PROJECT EVALS] Fetching group members and their student names for ${studentIds.size} group members`);
      const { data: groupMembers, error: memberError } = await supabase
        .from('course_group_members')
        .select('id, student_id, studentaccounts(id, first_name, last_name)')
        .in('id', Array.from(studentIds));

      if (memberError) {
        console.error('❌ Error fetching group member details:', memberError);
      } else {
        console.log(`✅ [PROJECT EVALS] Found ${groupMembers?.length || 0} group members with student info`);
        groupMembers.forEach(member => {
          if (member.studentaccounts) {
            const fullName = `${member.studentaccounts.first_name} ${member.studentaccounts.last_name}`;
            studentInfoMap[member.id] = fullName;
            console.log(`   - Group Member ${member.id} → Student ${member.student_id} → ${fullName}`);
          }
        });
      }
    }

    // Helper function to transform criteria scores
    const transformCriteria = (criteriaObj) => {
      if (!criteriaObj) return {};
      const transformed = {};
      Object.entries(criteriaObj).forEach(([key, value]) => {
        const name = criteriaMap[key] || key; // Use mapped name or fallback to UUID
        transformed[name] = value;
      });
      console.log(`   🔄 [TRANSFORM] Input keys: [${Object.keys(criteriaObj).join(', ')}]`);
      console.log(`   🔄 [TRANSFORM] Mapped names: [${Object.keys(transformed).join(', ')}]`);
      return transformed;
    };

    // Process and format the data
    let evaluations = submissions.map(submission => {
      let evaluationData = submission.evaluation_data;
      
      // Parse evaluation_data if it's a string
      if (typeof evaluationData === 'string') {
        try {
          evaluationData = JSON.parse(evaluationData);
        } catch (e) {
          console.error(`❌ Failed to parse evaluation_data for submission ${submission.id}:`, e.message);
          evaluationData = {};
        }
      }
      if (!evaluationData) {
        evaluationData = {};
      }
      
      // Determine evaluation type from the form
      const isFormCustom = submission.project_evaluation_forms?.is_custom_evaluation === true || 
                           submission.project_evaluation_forms?.is_custom_evaluation === 'true';
      const isSubmissionCustom = submission.is_custom_evaluation === true || 
                                 submission.is_custom_evaluation === 'true';
      const isBothCustom = isFormCustom && isSubmissionCustom;
      const evaluationType = isBothCustom ? 'Custom Evaluation (File Submission)' : 'Built-In Evaluation';
      const isCustomEvaluation = submission.is_custom_evaluation === true || submission.is_custom_evaluation === 'true';

      if (view === 'received') {
        // For received evaluations:
        // - Built-in: Show all members who evaluated me with their individual scores
        // - Custom: Show all members who submitted files (anonymously)
        
        // Handle custom file evaluations - show all group members who submitted
        if (isBothCustom && submission.file_submission_url) {
          return {
            id: submission.id,
            type: 'project',
            evaluationType: evaluationType,
            projectId: submission.project_id,
            projectTitle: submission.projects?.title || 'Unknown Project',
            courseId: submission.projects?.course_id,
            groupId: submission.group_id,
            groupName: submission.course_groups?.group_name || 'Unknown Group',
            submissionDate: submission.submission_date,
            createdAt: submission.created_at,
            status: submission.status,
            evaluatorName: null, // Anonymized
            evaluatorId: submission.evaluator_id,
            // For custom, include the submitting member as an "evaluating member"
            evaluatedMembers: [{
              studentId: submission.evaluator_id,
              studentName: `Evaluator`, // Placeholder - will be updated in batch fetch
              memberNumber: 0,
              total: null, // Custom doesn't have scores
              criteria: {},
              feedback: '',
              hasFile: true,
              fileSubmission: {
                fileName: submission.file_name,
                fileUrl: submission.file_submission_url
              },
              _needsEvaluatorInfo: true, // Flag to fetch evaluator info
              _groupId: submission.group_id
            }],
            evaluatedMembersCount: 1,
            scores: {
              total: 'CUSTOM FILE',
              criteria: {},
              feedback: 'Custom file evaluation submitted'
            },
            isAnonymous: true,
            isCustomEvaluation: true
          };
        }
        
        // For built-in evaluations, show the evaluator (who evaluated me)
        const evaluatedMembers = evaluationData.evaluated_members || {};
        
        // Find the current student's data in evaluated_members
        // NOTE: evaluated_members keys might be EITHER course_group_members IDs OR studentaccounts IDs
        // Try both approaches
        let studentData = null;
        
        // First try: course_group_members IDs (new format)
        for (const memberId of memberIds) {
          if (evaluatedMembers[memberId]) {
            studentData = evaluatedMembers[memberId];
            break;
          }
        }
        
        // Second try: studentaccounts IDs (old format)
        if (!studentData && evaluatedMembers[studentId]) {
          studentData = evaluatedMembers[studentId];
        }
        
        if (!studentData) {
          return null; // Current student not evaluated in this submission
        }

        // Build single member entry for the evaluator
        // Use submission.evaluator_id - we'll fetch member info later
        const evaluatingMembers = [{
          studentId: submission.evaluator_id, // Store evaluator_id for now
          studentName: 'Evaluator', // Placeholder
          memberNumber: 0, // Placeholder
          total: studentData.total || 0,
          criteria: transformCriteria(studentData.criteria || {}),
          feedback: studentData.feedback || '',
          hasFile: false,
          _needsEvaluatorInfo: true, // Flag to indicate we need to fetch evaluator info
          _groupId: submission.group_id
        }];
        
        // For received, the average score is just this one evaluation
        const averageScore = studentData?.total || 0;

        return {
          id: submission.id,
          type: 'project',
          evaluationType: evaluationType,
          projectId: submission.project_id,
          projectTitle: submission.projects?.title || 'Unknown Project',
          courseId: submission.projects?.course_id,
          groupId: submission.group_id,
          groupName: submission.course_groups?.group_name || 'Unknown Group',
          submissionDate: submission.submission_date,
          createdAt: submission.created_at,
          status: submission.status,
          evaluatorName: null, // Anonymized - no evaluator shown
          evaluatorId: null,
          // Show all members who evaluated me
          evaluatedMembers: evaluatingMembers,
          evaluatedMembersCount: evaluatingMembers.length,
          // Average score across all evaluators
          scores: {
            total: averageScore,
            criteria: {}, // Don't show aggregate criteria, show per-evaluator
            feedback: ''
          },
          isAnonymous: true
        };
      } else {
        // For given evaluations, show full details
        
        // Handle custom file evaluations
        if (isBothCustom && submission.file_submission_url) {
          return {
            id: submission.id,
            type: 'project',
            evaluationType: evaluationType,
            projectId: submission.project_id,
            projectTitle: submission.projects?.title || 'Unknown Project',
            courseId: submission.projects?.course_id,
            groupId: submission.group_id,
            groupName: submission.course_groups?.group_name || 'Unknown Group',
            submissionDate: submission.submission_date,
            createdAt: submission.created_at,
            status: submission.status,
            evaluatorName: submission.studentaccounts 
              ? `${submission.studentaccounts.first_name} ${submission.studentaccounts.last_name}`
              : 'Unknown',
            evaluatorId: submission.evaluator_id,
            evaluatedMembers: [],
            evaluatedMembersCount: 0,
            isCustomEvaluation: true,
            fileSubmission: {
              fileName: submission.file_name,
              fileUrl: submission.file_submission_url
            },
            isAnonymous: false
          };
        }
        
        // For regular project evaluations - extract from evaluation_data.evaluated_members
        const evaluatedMembers = evaluationData.evaluated_members || {};
        console.log(`\n� [PROJECT EVAL ID: ${submission.id}]`);
        console.log(`   Member IDs in evaluation_data:`, Object.keys(evaluatedMembers));
        console.log(`   StudentInfoMap keys available:`, Object.keys(studentInfoMap));
        const evaluatedMembersArray = Object.entries(evaluatedMembers).map(([memberId, memberData], index) => {
          const name = studentInfoMap[memberId] || `Member ${index + 1}`;
          console.log(`   - Member ${index}: ID=${memberId}`);
          console.log(`     Name lookup: studentInfoMap[${memberId}] = ${name}`);
          console.log(`     Total: ${memberData.total}, Criteria count: ${Object.keys(memberData.criteria || {}).length}`);
          return {
            studentId: memberId,
            studentName: name,
            memberNumber: index + 1,
            total: memberData.total || 0,
            criteria: transformCriteria(memberData.criteria || {}),
            feedback: memberData.feedback || ''
          };
        });
        
        return {
          id: submission.id,
          type: 'project',
          evaluationType: evaluationType,
          projectId: submission.project_id,
          projectTitle: submission.projects?.title || 'Unknown Project',
          courseId: submission.projects?.course_id,
          groupId: submission.group_id,
          groupName: submission.course_groups?.group_name || 'Unknown Group',
          submissionDate: submission.submission_date,
          createdAt: submission.created_at,
          status: submission.status,
          evaluatorName: submission.studentaccounts 
            ? `${submission.studentaccounts.first_name} ${submission.studentaccounts.last_name}`
            : 'Unknown',
          evaluatorId: submission.evaluator_id,
          evaluatedMembers: evaluatedMembersArray,
          evaluatedMembersCount: evaluatedMembersArray.length,
          isCustomEvaluation: false,
          isAnonymous: false
        };
      }
    }).filter(evaluation => evaluation !== null);

    // For received evaluations, fetch evaluator information in batch
    if (view === 'received' && evaluations.length > 0) {
      // Collect all unique evaluator IDs and their group IDs
      const evaluatorQueries = [];
      evaluations.forEach(evaluation => {
        if (evaluation.evaluatedMembers) {
          evaluation.evaluatedMembers.forEach(member => {
            if (member._needsEvaluatorInfo) {
              evaluatorQueries.push({
                studentId: member.studentId,
                groupId: member._groupId
              });
            }
          });
        }
      });
      
      // Fetch all evaluator course_group_members info
      const evaluatorInfoMap = {}; // Map of studentId+groupId -> {memberId, memberNumber}
      if (evaluatorQueries.length > 0) {
        for (const query of evaluatorQueries) {
          const key = `${query.studentId}-${query.groupId}`;
          if (!evaluatorInfoMap[key]) {
            const { data: evaluatorMember } = await supabase
              .from('course_group_members')
              .select('id')
              .eq('student_id', query.studentId)
              .eq('group_id', query.groupId)
              .single();
            
            if (evaluatorMember) {
              // Get all members in this group to determine member number
              const { data: allMembers } = await supabase
                .from('course_group_members')
                .select('id')
                .eq('group_id', query.groupId)
                .order('created_at', { ascending: true });
              
              const memberIndex = allMembers ? allMembers.findIndex(m => m.id === evaluatorMember.id) : -1;
              evaluatorInfoMap[key] = {
                memberId: evaluatorMember.id,
                memberNumber: memberIndex + 1,
                memberName: `Member ${memberIndex + 1}`
              };
            }
          }
        }
      }
      
      // Update evaluations with evaluator info
      evaluations.forEach(evaluation => {
        if (evaluation.evaluatedMembers) {
          evaluation.evaluatedMembers.forEach(member => {
            if (member._needsEvaluatorInfo) {
              const key = `${member.studentId}-${member._groupId}`;
              const info = evaluatorInfoMap[key];
              if (info) {
                member.studentId = info.memberId;
                member.studentName = info.memberName;
                member.memberNumber = info.memberNumber;
              }
              delete member._needsEvaluatorInfo;
              delete member._groupId;
            }
          });
        }
      });
    }

    // For received evaluations, group by project_id and combine evaluators
    if (view === 'received') {
      const groupedEvaluations = {};
      
      evaluations.forEach(evaluation => {
        const key = `${evaluation.projectId}`;
        
        if (!groupedEvaluations[key]) {
          // First evaluation for this project
          groupedEvaluations[key] = {
            ...evaluation,
            evaluatedMembers: evaluation.evaluatedMembers || [],
            scores: {
              total: evaluation.scores?.total === 'CUSTOM FILE' ? 'CUSTOM FILE' : 0,
              criteria: {},
              feedback: ''
            }
          };
        } else {
          // Add this evaluator's scores to the list
          if (evaluation.evaluatedMembers && evaluation.evaluatedMembers.length > 0) {
            groupedEvaluations[key].evaluatedMembers.push(...evaluation.evaluatedMembers);
          }
        }
      });
      
      // Calculate average scores for each grouped evaluation (only for non-custom)
      Object.values(groupedEvaluations).forEach(groupedEval => {
        if (groupedEval.scores.total !== 'CUSTOM FILE' && groupedEval.evaluatedMembers.length > 0) {
          const totalScore = groupedEval.evaluatedMembers.reduce((sum, member) => sum + (member.total || 0), 0);
          groupedEval.scores.total = Math.round(totalScore / groupedEval.evaluatedMembers.length);
          groupedEval.evaluatedMembersCount = groupedEval.evaluatedMembers.length;
        }
      });
      
      return Object.values(groupedEvaluations);
    }

    return evaluations;

  } catch (error) {
    console.error('Error in getProjectEvaluations:', error);
    throw error;
  }
}

module.exports = router;
