import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaCalendarAlt, FaClock, FaUser, FaCheckCircle, FaExclamationTriangle, FaDownload, FaUpload, FaSave, FaFileAlt, FaClipboardList, FaCheckDouble, FaListAlt, FaUsers, FaCheck, FaCrown } from 'react-icons/fa';
import dayjs from 'dayjs';

// Helper function to get profile image URL
const getProfileImageUrl = (member) => {
  if (!member?.profile_image_url) return null;
  return member.profile_image_url;
};

const EvaluationModal = ({ isOpen, onClose, evaluation, project, phase, groupData, currentUser, onEvaluationSubmitted }) => {
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [phaseEvaluationCriteria, setPhaseEvaluationCriteria] = useState([]);
  const [phaseEvaluationForm, setPhaseEvaluationForm] = useState(null);
  
  // Multi-page state for built-in evaluations
  // Pages: 'phase-details', 'member-N' (where N is member index), 'submission'
  const [currentPage, setCurrentPage] = useState('phase-details');
  const [currentMemberIndex, setCurrentMemberIndex] = useState(0);
  
  // Aggregated evaluation data structure (matches JSONB format)
  const [evaluationData, setEvaluationData] = useState({
    evaluated_members: {},
    progress: {},
    aggregate_total: 0,
    last_updated: null
  });
  
  const [fileInput, setFileInput] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [saveError, setSaveError] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null); // Track submission status from backend
  
  // File preview state
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null); // Store the selected file object
  
  // Auto-save debounce timer
  const autoSaveTimer = useRef(null);

  // Check if evaluation is past due date or already submitted
  const isPastDueDate = () => {
    if (!evaluation?.due_date) return false;
    const dueDate = new Date(evaluation.due_date);
    const now = new Date();
    return now > dueDate;
  };

  const isReadOnly = isPastDueDate() || evaluation?.status === 'submitted' || submissionStatus === 'submitted' || evaluationData?.submitted_at;

  // Load submission status to check if already submitted
  const loadSubmissionStatus = async () => {
    try {
      if (!evaluation?.phase_id || !evaluation?.group_id) return;
      
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/api/student/groups/${evaluation.group_id}/evaluations/my-submissions?phaseId=${evaluation.phase_id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const submissions = data.submissions || [];
        console.log('📊 [MODAL] Loaded submissions:', submissions);
        
        if (submissions.length > 0) {
          const submission = submissions[0];
          console.log('✅ [MODAL] Found submission with status:', submission.status);
          
          // Set submission status state
          setSubmissionStatus(submission.status);
          
          // Update evaluation object with actual submission status
          if (submission.status === 'submitted') {
            evaluation.status = 'submitted';
            console.log('🔄 [MODAL] Updated evaluation status to submitted');
          }
          
          // Load submission data
          if (submission.evaluation_data) {
            setEvaluationData(submission.evaluation_data);
          }
        }
      }
    } catch (error) {
      console.error('Error loading submission status:', error);
    }
  };

  useEffect(() => {
    if (isOpen && evaluation) {
      setIsModalLoading(true);
      
      // ✅ FIX: Reset evaluationData state when modal opens to prevent showing previous phase's data
      console.log('🔄 [MODAL OPEN] Resetting evaluation data for phase:', evaluation.phase_id, evaluation.phase_title);
      setEvaluationData({
        evaluated_members: {},
        progress: {},
        aggregate_total: 0
      });
      
      // Reset file upload state for custom evaluations
      setSelectedFile(null);
      setUploadedFileName(null);
      
      // Reset page to 'phase-details' for built-in evaluations
      const isBuiltIn = evaluation.is_custom_evaluation === false;
      if (isBuiltIn) {
        setCurrentPage('phase-details');
        setCurrentMemberIndex(0);
        // Use groupData from parent if available
        if (groupData && groupData.members && currentUser) {
          console.log('📋 Current User ID:', currentUser.id);
          console.log('📋 All members before filter:', groupData.members.length);
          
          // Filter out current user from members by comparing student_id
          const otherMembers = (groupData.members || []).filter(m => {
            // The member's student_id matches the currentUser's id (from profile)
            const isNotCurrentUser = m.student_id !== currentUser.id;
            console.log(`Member: ${m.full_name || m.name} - Include: ${isNotCurrentUser}`);
            return isNotCurrentUser;
          });
          
          console.log('✅ Filtered members (excluding current user):', otherMembers.length);
          setGroupMembers(otherMembers);
        } else if (groupData && groupData.members && !currentUser) {
          console.warn('⚠️ currentUser not provided, showing all members');
          setGroupMembers(groupData.members);
        }
      }
      
      // Load submission status first to check if already submitted
      loadSubmissionStatus();
      
      // Load existing submission data if available (for phase/project evaluation cards)
      if (evaluation.submission_data) {
        console.log('✅ Loading existing submission data:', evaluation.submission_data);
        setEvaluationData(evaluation.submission_data);
      } else if (evaluation.id && !evaluation.id.startsWith('phase-eval-') && !evaluation.id.startsWith('project-eval-')) {
        // Only load existing evaluation if it has a valid submission ID (not a phase/project card ID)
        loadExistingEvaluation();
      } else {
        console.log('ℹ️ No submission data to load for this evaluation');
      }
      // If it's a phase evaluation, check if we have criteria or need to load them
      if (evaluation.type === 'phase_evaluation') {
        // Check if criteria are already in the evaluation object (could be in criteria or evaluation_criteria field)
        const existingCriteria = evaluation.criteria || evaluation.evaluation_criteria || [];
        if (existingCriteria && existingCriteria.length > 0) {
          console.log('✅ Using criteria from evaluation object:', existingCriteria);
          setPhaseEvaluationCriteria(existingCriteria);
          // Also set the form data if available
          if (evaluation.evaluation_total_points || evaluation.total_points) {
            setPhaseEvaluationForm({
              total_points: evaluation.evaluation_total_points || evaluation.total_points || 100,
              criteria: existingCriteria
            });
          }
        } else {
          console.log('⚠️ No criteria in evaluation object, loading from API');
          loadPhaseEvaluationForm();
        }
      }
      // If it's a project evaluation, check if we have criteria or need to load them
      if (evaluation.type === 'project_evaluation') {
        const existingCriteria = evaluation.criteria || evaluation.evaluation_criteria || [];
        if (existingCriteria && existingCriteria.length > 0) {
          console.log('✅ Using criteria from project evaluation object:', existingCriteria);
          setPhaseEvaluationCriteria(existingCriteria);
          if (evaluation.evaluation_total_points || evaluation.total_points) {
            setPhaseEvaluationForm({
              total_points: evaluation.evaluation_total_points || evaluation.total_points || 100,
              criteria: existingCriteria
            });
          }
        } else {
          console.log('⚠️ No criteria in project evaluation object, loading from API');
          loadProjectEvaluationForm();
        }
      }
      setTimeout(() => setIsModalLoading(false), 300);
    }
  }, [isOpen, evaluation, groupData, currentUser]);

  // Load phase evaluation form details from backend
  const loadPhaseEvaluationForm = async () => {
    try {
      // Try to get phase ID from phase prop first, then from evaluation object
      const phaseId = phase?.id || evaluation?.phase_id;
      if (!phaseId) {
        console.error('❌ Cannot load phase evaluation form: No phase ID available', { phase, evaluation });
        return;
      }

      const token = localStorage.getItem('token');
      
      console.log('🔍 Loading phase evaluation form for phase ID:', phaseId);
      
      // Try multiple API endpoint patterns
      let response = null;
      let data = null;
      
      // Try endpoint 1: /api/phases/{phaseId}/evaluation-form
      response = await fetch(`/api/phases/${phaseId}/evaluation-form`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        data = await response.json();
        console.log('✅ Phase evaluation form loaded from /api/phases:', data);
      } else {
        // Try endpoint 2: /api/student/phases/{phaseId}/evaluation-form
        console.log('⚠️ First endpoint failed, trying alternative endpoint');
        response = await fetch(`/api/student/phases/${phaseId}/evaluation-form`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          data = await response.json();
          console.log('✅ Phase evaluation form loaded from /api/student/phases:', data);
        } else {
          console.error('❌ Failed to load phase evaluation form from both endpoints. Status:', response.status);
          const errorText = await response.text();
          console.error('❌ Error response:', errorText);
        }
      }

      if (data) {
        // Handle different response structures
        if (data.criteria && Array.isArray(data.criteria)) {
          setPhaseEvaluationCriteria(data.criteria);
          console.log('✅ Set criteria from data.criteria:', data.criteria.length, 'criteria');
        } else if (data.form?.criteria && Array.isArray(data.form.criteria)) {
          setPhaseEvaluationCriteria(data.form.criteria);
          console.log('✅ Set criteria from data.form.criteria:', data.form.criteria.length, 'criteria');
        } else if (Array.isArray(data)) {
          setPhaseEvaluationCriteria(data);
          console.log('✅ Set criteria from array response:', data.length, 'criteria');
        } else {
          console.warn('⚠️ Unexpected response structure:', data);
        }
        
        // Set form data
        if (data.form) {
          setPhaseEvaluationForm(data.form);
        } else if (data.total_points || evaluation?.evaluation_total_points) {
          setPhaseEvaluationForm({
            total_points: data.total_points || evaluation.evaluation_total_points || 100
          });
        }
      }
    } catch (error) {
      console.error('❌ Error loading phase evaluation form:', error);
    }
  };

  // Load project evaluation form details from backend
  const loadProjectEvaluationForm = async () => {
    try {
      if (!evaluation?.project_id) {
        console.log('❌ No project_id in evaluation:', evaluation);
        return;
      }

      const token = localStorage.getItem('token');
      
      // Fetch the project evaluation form
      const response = await fetch(`${API_BASE_URL}/api/student/projects/${evaluation.project_id}/evaluation-form`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Project evaluation form loaded:', data);
        setPhaseEvaluationForm(data.form || data);
        setPhaseEvaluationCriteria(data.criteria || data.form?.criteria || []);
      } else {
        console.warn('❌ Failed to load project evaluation form, status:', response.status);
      }
    } catch (error) {
      console.error('Error loading project evaluation form:', error);
    }
  };

  // Auto-save when evaluation data changes (for built-in evaluations)
  useEffect(() => {
    if (!isOpen || !evaluation || evaluation.is_custom_evaluation || evaluation.id?.startsWith('phase-eval-') || evaluation.id?.startsWith('project-eval-')) return;

    // Clear existing timer
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    // Set new timer for auto-save (1 second debounce)
    autoSaveTimer.current = setTimeout(() => {
      autoSaveEvaluation();
    }, 1000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [evaluationData]);

  // Load group members for evaluation
  const loadGroupMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const groupId = project?.group_id || evaluation?.group_id;
      if (!token || !groupId) return;

      const response = await fetch(`${API_BASE_URL}/api/student/groups/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter out current user from members
        const currentUserId = localStorage.getItem('userId');
        const otherMembers = (data.members || []).filter(m => m.id !== currentUserId);
        setGroupMembers(otherMembers);
        
        // Initialize aggregated evaluation structure
        const evaluatedMembers = {};
        const progress = {};
        
        otherMembers.forEach(member => {
          evaluatedMembers[member.id] = {
            criteria: {},
            total: 0,
            saved_at: null
          };
          
          if (evalData?.criteria && Array.isArray(evalData.criteria)) {
            evalData.criteria.forEach(criterion => {
              evaluatedMembers[member.id].criteria[criterion.id] = 0;
            });
          }
          
          progress[member.id] = 'not_started';
        });
        
        setEvaluationData(prev => ({
          ...prev,
          evaluated_members: evaluatedMembers,
          progress: progress
        }));
        
        // Set first member as selected
        if (otherMembers.length > 0) {
          setSelectedMember(otherMembers[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading group members:', error);
    }
  };

  // Load existing evaluation if it exists
  const loadExistingEvaluation = async () => {
    try {
      if (!evaluation.id) return;
      
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/evaluations/submission/${evaluation.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.evaluation_data) {
          setEvaluationData(data.evaluation_data);
        }
      }
    } catch (error) {
      console.error('Error loading existing evaluation:', error);
    }
  };

  // Auto-save evaluation (only saves if changed)
  const autoSaveEvaluation = async () => {
    // Skip auto-save for phase/project evaluations (IDs start with 'phase-eval-' or 'project-eval-')
    if (!evaluation.id || evaluation.is_custom_evaluation || evaluation.id.startsWith('phase-eval-') || evaluation.id.startsWith('project-eval-')) {
      return;
    }

    try {
      setSaveStatus('saving');
      setSaveError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/evaluations/submission/${evaluation.id}/save`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          evaluation_data: evaluationData,
          status: 'in_progress'
        })
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Failed to save evaluation');
      }
    } catch (error) {
      console.error('Error auto-saving evaluation:', error);
      setSaveStatus('error');
      setSaveError(error.message);
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const getHeaderColor = (evaluation) => {
    // Pink for phase evaluations
    return '#ec4899';
  };

  const getPhaseEvaluationStatus = () => {
    const now = new Date();
    const availableFrom = evaluation?.available_from ? new Date(evaluation.available_from) : null;
    const dueDate = evaluation?.due_date ? new Date(evaluation.due_date) : null;
    
    // ✅ FIX: Check if already submitted (from card status, backend status, or timestamp)
    if (evaluation?.status === 'submitted' || submissionStatus === 'submitted') return 'submitted';
    
    // ✅ FIX: Check for actual submission timestamps (not just initialized data)
    if (evaluationData?.submitted_at || evaluation?.submission_date) return 'submitted';
    
    // ✅ FIX: Check if there are actual scores AND a submission ID (means it was loaded from backend)
    if (evaluationData?.evaluated_members && Object.keys(evaluationData.evaluated_members).length > 0) {
      const hasActualScores = Object.values(evaluationData.evaluated_members).some(member => 
        member?.criteria && Object.keys(member.criteria).length > 0 && member.total > 0
      );
      if (hasActualScores && evaluation?.submission_id) {
        return 'submitted';
      }
    }
    
    // If not yet available
    if (availableFrom && now < availableFrom) return 'upcoming';
    
    // If past due date (and not submitted)
    if (dueDate && now > dueDate) return 'missed';
    
    // If within the evaluation window OR no dates set (always available)
    // Case 1: Both dates set and within window
    if (availableFrom && dueDate && now >= availableFrom && now <= dueDate) return 'ongoing';
    
    // Case 2: Only dueDate set (available from start) and not past due
    if (!availableFrom && dueDate && now <= dueDate) return 'ongoing';
    
    // Case 3: Only availableFrom set (no deadline) and already available
    if (availableFrom && !dueDate && now >= availableFrom) return 'ongoing';
    
    // Case 4: No dates set at all (always available)
    if (!availableFrom && !dueDate) return 'ongoing';
    
    return 'upcoming';
  };

  const getStatusPillColor = () => {
    const status = getPhaseEvaluationStatus();
    switch(status) {
      case 'upcoming': return '#ec4899'; // Light pink
      case 'ongoing': return '#be185d'; // Darker pink
      case 'submitted': return '#831843'; // Even darker pink
      case 'missed': return '#500724'; // Darkest pink
      default: return '#ec4899';
    }
  };

  const getStatusPillText = () => {
    const status = getPhaseEvaluationStatus();
    switch(status) {
      case 'upcoming': return 'Upcoming';
      case 'ongoing': return 'Ongoing';
      case 'submitted': return 'Submitted';
      case 'missed': return 'Missed';
      default: return status;
    }
  };

  const getLoadingColor = () => {
    if (!evaluation) return '#34656D';
    return getHeaderColor(evaluation);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const isEvaluationLate = (evaluation) => {
    if (!evaluation.due_date) return false;
    const now = new Date();
    const dueDate = new Date(evaluation.due_date);
    return now > dueDate && evaluation.status !== 'submitted' && evaluation.status !== 'completed';
  };

  // Navigation helpers for built-in evaluations
  const goToPreviousPage = () => {
    if (currentPage === 'submission') {
      // Go back to last member
      if (groupMembers.length > 0) {
        setCurrentPage(`member-${groupMembers.length - 1}`);
        setCurrentMemberIndex(groupMembers.length - 1);
      } else {
        setCurrentPage('phase-details');
      }
    } else if (currentPage.startsWith('member-')) {
      const memberIdx = parseInt(currentPage.split('-')[1]);
      if (memberIdx > 0) {
        setCurrentPage(`member-${memberIdx - 1}`);
        setCurrentMemberIndex(memberIdx - 1);
      } else {
        setCurrentPage('phase-details');
      }
    }
  };

  const goToNextPage = () => {
    if (currentPage === 'phase-details') {
      // Go to first member
      if (groupMembers.length > 0) {
        setCurrentPage('member-0');
        setCurrentMemberIndex(0);
      } else {
        setCurrentPage('submission');
      }
    } else if (currentPage.startsWith('member-')) {
      const memberIdx = parseInt(currentPage.split('-')[1]);
      if (memberIdx < groupMembers.length - 1) {
        setCurrentPage(`member-${memberIdx + 1}`);
        setCurrentMemberIndex(memberIdx + 1);
      } else {
        setCurrentPage('submission');
      }
    }
  };

  const canGoPrevious = () => {
    return currentPage !== 'phase-details';
  };

  const canGoNext = () => {
    // Can't go next if on submission page
    if (currentPage === 'submission') return false;
    
    // If on phase-details, can always go next
    if (currentPage === 'phase-details') return true;
    
    // If on member page, check if all criteria are filled
    if (currentPage.startsWith('member-')) {
      const currentMember = groupMembers[currentMemberIndex];
      if (!currentMember) return false;
      
      // Check if all criteria have scores
      const allCriteriaFilled = phaseEvaluationCriteria?.every(criterion => {
        const score = evaluationData.evaluated_members[currentMember.student_id]?.criteria[criterion.id];
        return score !== undefined && score !== null && score !== '' && score !== 0;
      });
      
      return allCriteriaFilled || false;
    }
    
    return false;
  };

  // Handle criterion score change (updates aggregated data)
  const handleScoreChange = (memberId, criterionId, newScore, maxPoints) => {
    setEvaluationData(prev => {
      const updated = { ...prev };
      
      if (!updated.evaluated_members[memberId]) {
        updated.evaluated_members[memberId] = {
          criteria: {},
          total: 0,
          saved_at: null
        };
      }

      // Parse the score and validate it
      let parsedScore = parseInt(newScore) || 0;
      
      // Ensure score doesn't exceed max_points
      if (maxPoints !== undefined && parsedScore > maxPoints) {
        parsedScore = maxPoints;
      }
      
      // Ensure score is not negative
      if (parsedScore < 0) {
        parsedScore = 0;
      }

      updated.evaluated_members[memberId].criteria[criterionId] = parsedScore;
      
      // Recalculate member total
      const memberTotal = Object.values(updated.evaluated_members[memberId].criteria)
        .reduce((sum, score) => sum + (score || 0), 0);
      updated.evaluated_members[memberId].total = memberTotal;

      // Recalculate aggregate total
      updated.aggregate_total = Object.values(updated.evaluated_members)
        .reduce((sum, member) => sum + (member.total || 0), 0);

      // Update progress for this member
      if (updated.progress[memberId] === 'not_started') {
        updated.progress[memberId] = 'in_progress';
      }

      updated.last_updated = new Date().toISOString();

      return updated;
    });
  };

  // Handle PDF download for custom evaluations
  const handleDownloadPDF = () => {
    if (evaluation.file_url || evaluation.custom_file_url) {
      try {
        const fileUrl = evaluation.file_url || evaluation.custom_file_url;
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = evaluation.file_name || evaluation.custom_file_name || 'evaluation-form.pdf';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Failed to download PDF');
      }
    }
  };

  // Handle PDF view/preview for custom evaluations
  const handleViewPDF = () => {
    setShowFilePreview(true);
  };

  // Handle file selection for custom evaluations (doesn't upload yet)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF, DOC, or DOCX file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Store the file and filename
    setSelectedFile(file);
    setUploadedFileName(file.name);
  };

  // Handle submission of custom evaluation with file
  const handleSubmitCustomEvaluation = async () => {
    if (!selectedFile) {
      alert('Please select a file before submitting');
      return;
    }

    try {
      setUploading(true);
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const base64 = event.target?.result;
        
        // Extract required fields from evaluation object
        const phase_id = evaluation.phase_id;
        const group_id = evaluation.group_id || groupData?.group_id || groupData?.id;
        const project_id = evaluation.project_id || project?.id;
        
        console.log('📊 [CUSTOM EVAL SUBMIT] Extracted IDs:', { phase_id, group_id, project_id });
        
        if (!phase_id || !group_id) {
          alert('❌ Missing required information (phase_id or group_id)');
          setUploading(false);
          return;
        }
        
        // Submit to backend - for custom evaluations with file
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/evaluations/phase-custom/submit`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            phase_id,
            group_id,
            project_id,
            file_submission_url: base64,
            file_name: selectedFile.name,
            is_custom_evaluation: true,
            status: 'submitted'
          })
        });

        if (response.ok) {
          alert('✅ Evaluation submitted successfully!');
          if (onEvaluationSubmitted) {
            onEvaluationSubmitted(evaluation.id);
          }
          setTimeout(() => onClose(), 500);
        } else {
          const error = await response.json();
          alert(`❌ Failed to upload evaluation: ${error.message || error.error || 'Unknown error'}`);
        }
        setUploading(false);
      };
      
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('❌ Failed to upload evaluation');
      setUploading(false);
    }
  };

  // Submit entire aggregated evaluation (all members at once)
  const handleSubmitAggregatedEvaluation = async () => {
    try {
      // Check if already submitted
      if (submissionStatus === 'submitted' || evaluation?.status === 'submitted' || evaluationData?.submitted_at) {
        alert('This evaluation has already been submitted and cannot be re-submitted');
        return;
      }

      // Validate that at least one member has been scored
      const hasScores = Object.values(evaluationData.evaluated_members || {})
        .some(member => member.total > 0);

      if (!hasScores) {
        alert('Please provide at least one evaluation score before submitting');
        return;
      }

      setUploading(true);
      const token = localStorage.getItem('token');
      
      // Extract required fields from evaluation object
      const phase_id = evaluation.phase_id || evaluation.id?.split('-')[1];
      const group_id = evaluation.group_id || groupData?.group_id || groupData?.id;
      const project_id = evaluation.project_id || evaluation.project?.id || project?.id;
      
      console.log('📊 [SUBMIT DEBUG] Extracted IDs:', { phase_id, group_id, project_id });
      console.log('📊 [SUBMIT DEBUG] Evaluation object keys:', Object.keys(evaluation));
      console.log('📊 [SUBMIT DEBUG] GroupData:', groupData);
      
      // Mark all members as completed and add required fields
      const completedEvalData = {
        ...evaluationData,
        phase_id,
        group_id,
        project_id,
        phase_evaluation_form_id: phaseEvaluationForm?.id,
        progress: Object.keys(evaluationData.progress || {}).reduce((acc, memberId) => ({
          ...acc,
          [memberId]: evaluationData.evaluated_members[memberId].total > 0 ? 'submitted' : evaluationData.progress[memberId]
        }), {})
      };
      
      console.log('📊 [SUBMIT DEBUG] Final completedEvalData:', completedEvalData);

      // Import apiConfig at the top if not already imported
      // Determine the correct endpoint based on evaluation type
      let endpoint = `${process.env.REACT_APP_API_URL || '${API_BASE_URL}'}/api/evaluations/submission/${evaluation.id}/submit`;
      if (evaluation.type === 'phase_evaluation') {
        endpoint = `${process.env.REACT_APP_API_URL || '${API_BASE_URL}'}/api/evaluations/submission/${evaluation.id}/submit`;
      } else if (evaluation.type === 'project_evaluation') {
        endpoint = `${process.env.REACT_APP_API_URL || '${API_BASE_URL}'}/api/project-evaluations/${evaluation.id}/submit`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          evaluation_data: completedEvalData,
          status: 'submitted'
        })
      });

      if (response.ok) {
        console.log('✅ [SUBMIT SUCCESS] Evaluation submitted successfully');
        // Update evaluation status to submitted
        evaluation.status = 'submitted';
        alert('Evaluation submitted successfully!');
        setUploading(false);
        // Notify parent component to refresh evaluation data
        if (onEvaluationSubmitted) {
          onEvaluationSubmitted(evaluation.id);
        }
        // Close modal after brief delay to show success
        setTimeout(() => onClose(), 500);
      } else {
        const error = await response.json();
        console.error('❌ [SUBMIT ERROR]', error);
        alert(`Failed to submit evaluation: ${error.message || error.error}`);
        setUploading(false);
      }
    } catch (error) {
      console.error('Error submitting aggregated evaluation:', error);
      alert('Failed to submit evaluation');
      setUploading(false);
    }
  };

  // Check if modal should render
  if (!isOpen || !evaluation) return null;

  // Normalize evaluation object to handle both 'criteria' and 'evaluation_criteria' field names
  const evaluationNormalized = {
    ...evaluation,
    criteria: evaluation.criteria || evaluation.evaluation_criteria || [],
    total_points: evaluation.total_points || evaluation.evaluation_total_points || 0
  };

  const isCustomEvaluation = evaluationNormalized?.is_custom_evaluation === true;
  const isBuiltInEvaluation = evaluationNormalized?.is_custom_evaluation === false;

  // Use normalized evaluation object for rendering
  const evalData = evaluationNormalized;

  // ========== BUILT-IN EVALUATION PAGE RENDERING FUNCTIONS ==========

  // Page 1: Phase Details
  const renderPhaseDetailsPage = () => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getFileTypesDisplay = () => {
    const fileTypes = phase?.file_types_allowed || evalData.file_types_allowed;
    if (!fileTypes || fileTypes === '[]' || (Array.isArray(fileTypes) && fileTypes.length === 0)) {
      return 'Any file type';
    }
    return fileTypes;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr 1fr',
        gap: '1rem'
      }}>
        <div>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>Phase</p>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#1f2937', fontWeight: '600' }}>
            Phase {phase?.phase_number || evalData.phase_number}
          </p>
        </div>
        
        <div>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>Total Points</p>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#1f2937', fontWeight: '600' }}>
            {evalData.total_points || 100}
          </p>
        </div>
        
        <div>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>Due Date</p>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#1f2937', fontWeight: '600' }}>
            {formatDateTime(evalData.due_date)}
          </p>
        </div>
        
        <div>
          <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>File Types</p>
          <p style={{ margin: 0, fontSize: '0.95rem', color: '#1f2937', fontWeight: '600' }}>
            {getFileTypesDisplay()}
          </p>
        </div>
      </div>

      {(phaseEvaluationForm?.instructions || evalData.description) && (
        <div style={{
          paddingTop: '1rem',
          borderTop: '1px solid #e5e7eb'
        }}>
          <p style={{ margin: 0, color: '#6b7280', lineHeight: '1.5', fontSize: '0.9rem' }}>
            {phaseEvaluationForm?.instructions || evalData.description}
          </p>
        </div>
      )}
    </div>
  );
  };

  // Page 2+: Member Evaluation
  const renderMemberPage = () => {
    if (!groupMembers.length) return null;
    
    const currentMember = groupMembers[currentMemberIndex];
    if (!currentMember) return null;

    const totalCriteria = phaseEvaluationCriteria?.length || 0;
    const completedCriteria = phaseEvaluationCriteria?.filter(c => {
      const val = evaluationData.evaluated_members[currentMember.student_id]?.criteria[c.id];
      return val !== undefined && val !== null && val !== '' && val !== 0;
    }).length || 0;
    const totalPoints = phaseEvaluationForm?.total_points || phaseEvaluationCriteria?.reduce((sum, c) => sum + c.max_points, 0) || 0;
    const currentTotal = evaluationData.evaluated_members[currentMember.student_id]?.total || 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Member Header with Profile and Score */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            {/* Profile Image */}
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#e5e7eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem',
              fontWeight: '700',
              color: '#6b7280',
              overflow: 'hidden',
              flexShrink: 0,
              backgroundImage: getProfileImageUrl(currentMember) ? `url("${getProfileImageUrl(currentMember)}")` : 'none',
              backgroundSize: 'cover',
              backgroundPosition: 'center center'
            }}>
              {!getProfileImageUrl(currentMember) && 'M'}
            </div>
            {/* Member Info */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                {currentMember.first_name} {currentMember.last_name}
              </h2>
              <p style={{
                margin: 0,
                fontSize: '0.95rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                {currentMember.is_leader || currentMember.role === 'leader' ? 'leader' : 'member'}
              </p>
            </div>
          </div>
          {/* Score */}
          <div style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: '#1f2937',
            whiteSpace: 'nowrap'
          }}>
            {currentTotal} / {totalPoints}
          </div>
        </div>

        {/* Clear Button - Hidden when read-only */}
        {!isReadOnly && (
          <button
            onClick={() => {
              const updatedCriteria = {};
              phaseEvaluationCriteria?.forEach(c => {
                updatedCriteria[c.id] = 0;
              });
              setEvaluationData(prev => ({
                ...prev,
                evaluated_members: {
                  ...prev.evaluated_members,
                  [currentMember.student_id]: {
                    ...prev.evaluated_members[currentMember.student_id],
                    criteria: updatedCriteria,
                    total: 0
                  }
                },
                aggregate_total: Object.values(prev.evaluated_members).reduce((sum, member) => {
                  if (member.student_id === currentMember.student_id) return sum;
                  return sum + (member.total || 0);
                }, 0)
              }));
            }}
            style={{
              alignSelf: 'flex-start',
              padding: '0.5rem 1rem',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#dc2626';
              e.target.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ef4444';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            Clear Grades
          </button>
        )}

        {/* Evaluation Criteria Grid - 2 columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem'
        }}>
          {phaseEvaluationCriteria && Array.isArray(phaseEvaluationCriteria) && phaseEvaluationCriteria.length > 0 ? (
            phaseEvaluationCriteria.map((criterion) => {
              const currentValue = evaluationData.evaluated_members[currentMember.student_id]?.criteria[criterion.id] || 0;
              const isFilled = currentValue !== undefined && currentValue !== null && currentValue !== '' && currentValue !== 0;
              const percentage = criterion.max_points > 0 ? Math.round((currentValue / criterion.max_points) * 100) : 0;
              
              return (
                <div key={criterion.id} style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  padding: '1rem',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '0.75rem'
                  }}>
                    <h4 style={{
                      margin: 0,
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      color: '#1a1a1a',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      flex: 1
                    }}>
                      {criterion.name}
                      {isFilled && <FaCheck style={{ color: '#10b981', fontSize: '0.75rem' }} />}
                    </h4>
                    <span style={{
                      backgroundColor: '#e0f2fe',
                      color: '#0369a1',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      marginLeft: '0.5rem'
                    }}>
                      {criterion.max_points} pts
                    </span>
                  </div>
                  
                  {criterion.description && (
                    <p style={{
                      margin: '0 0 0.75rem 0',
                      fontSize: '0.8rem',
                      color: '#6b7280',
                      lineHeight: '1.4'
                    }}>
                      {criterion.description}
                    </p>
                  )}
                  
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    backgroundColor: '#fff',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    border: '1px solid #ddd'
                  }}>
                    <input
                      type="number"
                      min="0"
                      max={criterion.max_points}
                      value={currentValue}
                      onChange={(e) => !isReadOnly && handleScoreChange(currentMember.student_id, criterion.id, e.target.value, criterion.max_points)}
                      onBlur={(e) => {
                        if (isReadOnly) return;
                        let val = parseInt(e.target.value) || 0;
                        if (val > criterion.max_points) {
                          val = criterion.max_points;
                        }
                        if (val < 0) {
                          val = 0;
                        }
                        handleScoreChange(currentMember.student_id, criterion.id, val.toString(), criterion.max_points);
                      }}
                      placeholder="0"
                      disabled={isReadOnly}
                      style={{
                        width: '70px',
                        border: 'none',
                        textAlign: 'center',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        outline: 'none',
                        color: isReadOnly ? '#9ca3af' : '#3b82f6',
                        backgroundColor: isReadOnly ? '#f3f4f6' : '#fff',
                        cursor: isReadOnly ? 'not-allowed' : 'text'
                      }}
                    />
                    <span style={{
                      color: '#999',
                      fontSize: '0.85rem',
                      fontWeight: '500'
                    }}>
                      / {criterion.max_points}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#999',
              gridColumn: '1 / -1'
            }}>
              No evaluation criteria available
            </div>
          )}
        </div>

      </div>
    );
  };

  // Page 3: Submission/Summary
  const renderSubmissionPage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        {/* Member Cards Grid */}
        {groupMembers.length > 0 && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem'
          }}>
            {groupMembers.map((member) => {
              const memberScore = evaluationData.evaluated_members[member.student_id]?.total || 0;
              const totalPoints = evalData.total_points || 100;
              const profileImage = getProfileImageUrl(member);
              const isLeader = member.is_leader || member.role === 'leader';
              const memberTasks = groupData?.tasks?.filter(t => t.assigned_to === member.id) || [];
              
              return (
                <div key={member.id} style={{
                  display: 'flex',
                  gap: '1.5rem',
                  padding: '1.5rem',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                }}>
                  {/* Left: Profile Section */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.75rem',
                    minWidth: '120px'
                  }}>
                    {/* Profile Image */}
                    <div style={{
                      position: 'relative',
                      width: '80px',
                      height: '80px',
                      backgroundColor: '#f3f4f6',
                      border: '2px solid #e5e7eb',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}>
                      {profileImage ? (
                        <img
                          src={profileImage}
                          alt={`${member.first_name} ${member.last_name}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <FaUser style={{ fontSize: '1.5rem', color: '#9ca3af' }} />
                      )}
                      
                      {/* Role Badge */}
                      {isLeader && (
                        <div style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          backgroundColor: '#fbbf24',
                          borderRadius: '50%',
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)'
                        }}>
                          <FaCrown style={{ fontSize: '0.85rem', color: '#ffffff' }} />
                        </div>
                      )}
                    </div>

                    {/* Member Name */}
                    <div style={{
                      textAlign: 'center',
                      width: '100%'
                    }}>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: '700',
                        color: '#1f2937'
                      }}>
                        {member.first_name} {member.last_name}
                      </div>
                    </div>

                    {/* Role Badge */}
                    <div style={{
                      fontSize: '0.7rem',
                      fontWeight: '600',
                      color: isLeader ? '#d97706' : '#6b7280',
                      backgroundColor: isLeader ? '#fef3c7' : '#f3f4f6',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px'
                    }}>
                      {isLeader ? 'Leader' : 'Member'}
                    </div>
                  </div>

                  {/* Middle: Score Section */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minWidth: '100px',
                    borderRight: '1px solid #e5e7eb',
                    paddingRight: '1.5rem'
                  }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>Score</p>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#000000'
                    }}>
                      {memberScore}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: '#6b7280'
                    }}>
                      / {totalPoints}
                    </div>
                  </div>

                  {/* Right: Tasks Section */}
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}>
                    <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#6b7280', fontWeight: '500' }}>Assigned Tasks</p>
                    {memberTasks.length > 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}>
                        {memberTasks.map((task) => {
                          const statusColors = {
                            'pending': { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
                            'in_progress': { bg: '#dbeafe', text: '#1e40af', border: '#93c5fd' },
                            'completed': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
                            'submitted': { bg: '#dcfce7', text: '#166534', border: '#86efac' },
                            'default': { bg: '#f3f4f6', text: '#6b7280', border: '#e5e7eb' }
                          };
                          const statusColor = statusColors[task.status?.toLowerCase()] || statusColors.default;
                          
                          return (
                            <div key={task.id} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '0.5rem 0.75rem',
                              backgroundColor: statusColor.bg,
                              border: `1px solid ${statusColor.border}`,
                              borderRadius: '6px',
                              fontSize: '0.8rem'
                            }}>
                              <span style={{ color: '#1f2937', fontWeight: '500' }}>{task.title || task.name}</span>
                              <span style={{
                                color: statusColor.text,
                                fontWeight: '600',
                                fontSize: '0.7rem',
                                padding: '0.2rem 0.5rem',
                                backgroundColor: 'rgba(255, 255, 255, 0.5)',
                                borderRadius: '4px'
                              }}>
                                {task.status?.toUpperCase() || 'PENDING'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#9ca3af' }}>No tasks assigned</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Determine which page to render
  const renderCurrentPage = () => {
    if (currentPage === 'phase-details') {
      return renderPhaseDetailsPage();
    } else if (currentPage.startsWith('member-')) {
      return renderMemberPage();
    } else if (currentPage === 'submission') {
      return renderSubmissionPage();
    }
    return null;
  };

  // Get page title for navigation
  const getPageTitle = () => {
    if (currentPage === 'phase-details') return 'Phase Details';
    if (currentPage.startsWith('member-')) {
      const member = groupMembers[currentMemberIndex];
      return `Evaluate ${member?.first_name || 'Member'}`;
    }
    if (currentPage === 'submission') return 'Review & Submit';
    return '';
  };

  return (
    <div className="task-detail-modal-overlay" onClick={onClose}>
      <div className="task-detail-modal-container" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* Loading Overlay */}
        {isModalLoading && (
          <div className="modal-loading-overlay" style={{
            position: 'absolute',
            top: '80px',
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            borderRadius: '0 0 20px 20px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #f3f3f3',
              borderTop: `3px solid ${getLoadingColor()}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '1rem'
            }}></div>
            <div style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: getLoadingColor(),
              textAlign: 'center'
            }}>
              Loading...
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div style={{
          backgroundColor: getHeaderColor(evaluation),
          borderBottom: 'none',
          padding: '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{
              margin: 0,
              fontSize: '1.3rem',
              fontWeight: 600,
              color: '#ffffff',
              textShadow: 'none',
              WebkitTextFillColor: '#ffffff',
              filter: 'none'
            }}>
              Phase {phase?.title || evalData.phase_title || 'Evaluation'} Evaluation
            </h2>
            <div style={{
              backgroundColor: getStatusPillColor(),
              color: 'white',
              padding: '0.35rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              whiteSpace: 'nowrap'
            }}>
              {getPhaseEvaluationStatus() === 'upcoming' ? <FaClock style={{ fontSize: '0.65rem' }} /> : 
               getPhaseEvaluationStatus() === 'ongoing' ? <FaClock style={{ fontSize: '0.65rem' }} /> : 
               getPhaseEvaluationStatus() === 'submitted' ? <FaCheckDouble style={{ fontSize: '0.65rem' }} /> : 
               getPhaseEvaluationStatus() === 'missed' ? <FaTimes style={{ fontSize: '0.65rem' }} /> : null}
              {getStatusPillText()}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.3rem',
              cursor: 'pointer',
              color: '#ffffff',
              padding: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.8,
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '1'}
            onMouseLeave={(e) => e.target.style.opacity = '0.8'}
          >
            <FaTimes />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {isBuiltInEvaluation ? (
            // Built-in Evaluation - Two Column Layout
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0, height: '100%' }}>
              {/* Left Column - Navigation Sidebar */}
              <div style={{
                backgroundColor: 'white',
                borderRight: '1px solid #e0e0e0',
                padding: '0',
                display: 'flex',
                flexDirection: 'column',
                overflowY: 'auto',
                gap: '0'
              }}>
              {/* Phase Details Button */}
              <button
                onClick={() => {
                  setCurrentPage('phase-details');
                }}
                style={{
                  backgroundColor: currentPage === 'phase-details' ? '#f0f0f0' : 'white',
                  color: '#333',
                  border: 'none',
                  borderBottom: '1px solid #e0e0e0',
                  padding: '12px 14px',
                  borderRadius: '0',
                  cursor: 'pointer',
                  fontSize: '1.02rem',
                  fontWeight: '500',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  margin: 0
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 'phase-details') {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 'phase-details') {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <FaListAlt style={{ fontSize: '1rem', flexShrink: 0, color: '#666' }} />
                <span>Phase Details</span>
              </button>

              {/* Member Buttons */}
              {groupMembers.map((member, idx) => {
                const memberScore = evaluationData.evaluated_members[member.student_id]?.total || 0;
                const isCompleted = memberScore > 0;
                // Use same naming logic as "My Group" sidebar
                const memberName = member.full_name || member.user_name || member.name || 'Unknown';
                const memberPosition = member.position || member.role || member.title || 'Team Member';
                
                // Check if current member evaluation is complete
                const currentMember = groupMembers[currentMemberIndex];
                const isCurrentMemberComplete = currentMember && evaluationData.evaluated_members[currentMember.student_id]?.total > 0;
                const canClickButton = idx <= currentMemberIndex || isCurrentMemberComplete;
                
                return (
                  <button
                    key={member.id}
                    onClick={() => {
                      if (canClickButton) {
                        setCurrentPage(`member-${idx}`);
                        setCurrentMemberIndex(idx);
                      }
                    }}
                    disabled={!canClickButton}
                    style={{
                      backgroundColor: currentPage === `member-${idx}` ? '#f0f0f0' : 'white',
                      color: canClickButton ? '#333' : '#ccc',
                      border: 'none',
                      borderBottom: '1px solid #e0e0e0',
                      padding: '12px 14px',
                      borderRadius: '0',
                      cursor: canClickButton ? 'pointer' : 'not-allowed',
                      fontSize: '0.9rem',
                      fontWeight: '500',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      margin: 0,
                      opacity: canClickButton ? 1 : 0.5
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== `member-${idx}` && canClickButton) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== `member-${idx}` && canClickButton) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                    title={canClickButton ? `Evaluating Member: ${memberName} - ${memberPosition}` : 'Complete current member evaluation first'}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', flex: 1, minWidth: 0, flexDirection: 'column' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%' }}>
                        <FaUser style={{ fontSize: '0.9rem', flexShrink: 0, color: '#666', marginTop: '2px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Evaluating Member:</div>
                          <div style={{ fontWeight: '500', fontSize: '0.9rem', color: '#333' }}>{memberName}</div>
                          <div style={{ fontSize: '0.84rem', color: '#666' }}>{memberPosition}</div>
                        </div>
                      </div>
                    </div>
                    {isCompleted && (
                      <FaCheck style={{ fontSize: '0.78rem', color: '#666', marginLeft: '4px', flexShrink: 0, marginTop: '3px' }} />
                    )}
                  </button>
                );
              })}

              {/* Submission Button */}
              {(() => {
                const allMembersEvaluated = groupMembers.every(member => {
                  // Check if all criteria are filled for this member
                  const allCriteriaFilled = phaseEvaluationCriteria?.every(criterion => {
                    const score = evaluationData.evaluated_members[member.student_id]?.criteria[criterion.id];
                    return score !== undefined && score !== null && score !== '' && score !== 0;
                  });
                  return allCriteriaFilled || false;
                });
                const canSubmit = allMembersEvaluated;
                
                return (
                  <button
                    onClick={() => {
                      if (canSubmit) {
                        setCurrentPage('submission');
                      }
                    }}
                    disabled={!canSubmit}
                    style={{
                      backgroundColor: currentPage === 'submission' ? '#f0f0f0' : 'white',
                      color: canSubmit ? '#333' : '#ccc',
                      border: 'none',
                      padding: '12px 14px',
                      borderRadius: '0',
                      cursor: canSubmit ? 'pointer' : 'not-allowed',
                      fontSize: '1.02rem',
                      fontWeight: '500',
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      margin: 0,
                      opacity: canSubmit ? 1 : 0.5
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== 'submission' && canSubmit) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== 'submission' && canSubmit) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                    title={canSubmit ? 'Review and submit your evaluations' : 'Complete all member evaluations first'}
                  >
                    <FaCheckCircle style={{ fontSize: '1rem', flexShrink: 0, color: canSubmit ? '#666' : '#ccc' }} />
                    <span>Review & Submit</span>
                  </button>
                );
              })()}
            </div>

            {/* Right Column - Content Area */}
            <div style={{
              padding: '2rem',
              overflowY: 'auto',
              backgroundColor: '#ffffff'
            }}>
              {!currentPage.startsWith('member-') && (
                // Default title for other pages
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '2rem' }}>
                  {getPageTitle()}
                </h2>
              )}
              {renderCurrentPage()}
            </div>
          </div>
         ) : (
           // Custom Evaluation - Full Width Layout
           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
             {/* Full Width Content */}
             <div style={{ flex: 1 }}>
            {/* Custom Evaluation - Centered UI */}
            {isCustomEvaluation && (
              <div className="task-detail-modal-description-section">
                {/* Single Centered Section */}
                <div style={{
                  backgroundColor: 'transparent',
                  padding: '1rem',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  {/* Header */}
                  <div>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: '#fce7f3',
                      border: '3px solid #ec4899',
                      color: '#ec4899',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.5rem',
                      margin: '0 auto 0.5rem'
                    }}>
                      <FaClipboardList />
                    </div>
                    <h3 style={{
                      margin: '0 0 0.25rem 0',
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      color: '#1f2937'
                    }}>
                      Evaluation Form
                    </h3>
                    <p style={{
                      margin: 0,
                      color: '#6b7280',
                      fontSize: '0.85rem',
                      maxWidth: '500px',
                      lineHeight: '1.3'
                    }}>
                      {evaluation.file_name || evaluation.custom_file_name || 'evaluation-form.pdf'}
                    </p>
                  </div>

                  {/* Evaluation Info Pills */}
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '0.5rem',
                    justifyContent: 'center',
                    maxWidth: '600px',
                    marginTop: '0.5rem'
                  }}>
                    {evaluation.total_points && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#0369a1'
                      }}>
                        <span>📊</span>
                        <span>{evaluation.total_points} Points</span>
                      </div>
                    )}
                    {evaluation.due_date && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: '#fef3f2',
                        border: '1px solid #fecaca',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: '#dc2626'
                      }}>
                        <span>📅</span>
                        <span>Due: {dayjs(evaluation.due_date).format('MMM D, h:mm A')}</span>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  {evaluation.instructions && (
                    <div style={{
                      width: '100%',
                      maxWidth: '600px',
                      padding: '0.75rem',
                      backgroundColor: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      marginTop: '0.5rem'
                    }}>
                      <div style={{
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '0.25rem'
                      }}>
                        Instructions
                      </div>
                      <div style={{
                        fontSize: '0.8rem',
                        color: '#374151',
                        lineHeight: '1.4'
                      }}>
                        {evaluation.instructions}
                      </div>
                    </div>
                  )}

                  {/* View and Download Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'center',
                    flexWrap: 'wrap'
                  }}>
                    <button
                      onClick={handleViewPDF}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#ec4899',
                        color: 'white',
                        border: 'none',
                        padding: '0.625rem 1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        minWidth: '140px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#db2777';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 20px rgba(236, 72, 153, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#ec4899';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <FaFileAlt /> View Form
                    </button>

                    <button
                      onClick={handleDownloadPDF}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        padding: '0.625rem 1.5rem',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        transition: 'all 0.2s ease',
                        minWidth: '140px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#2563eb';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 20px rgba(59, 130, 246, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#3b82f6';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      <FaDownload /> Download
                    </button>
                  </div>

                  {/* Divider */}
                  <div style={{
                    width: '100%',
                    maxWidth: '500px',
                    height: '1px',
                    backgroundColor: '#e5e7eb',
                    position: 'relative',
                    margin: '0.5rem 0'
                  }}>
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      backgroundColor: 'white',
                      padding: '0 0.75rem',
                      color: '#9ca3af',
                      fontSize: '0.75rem',
                      fontWeight: '600'
                    }}>
                      THEN
                    </div>
                  </div>

                  {/* Upload Section */}
                  <div style={{ width: '100%', maxWidth: '600px' }}>
                    {uploadedFileName ? (
                      // File Selected View
                      <div style={{
                        backgroundColor: '#f0fdf4',
                        border: '2px solid #86efac',
                        borderRadius: '8px',
                        padding: '1rem',
                        textAlign: 'center'
                      }}>
                        <FaCheckCircle style={{ fontSize: '2rem', color: '#10b981', marginBottom: '0.5rem' }} />
                        <p style={{
                          margin: '0 0 0.25rem 0',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          color: '#166534'
                        }}>
                          ✓ File Ready to Submit
                        </p>
                        <p style={{
                          margin: '0 0 0.75rem 0',
                          fontSize: '0.8rem',
                          color: '#15803d',
                          wordBreak: 'break-word'
                        }}>
                          {uploadedFileName}
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                          <button
                            onClick={() => {
                              setUploadedFileName(null);
                              setSelectedFile(null);
                              const input = document.getElementById('file-input-custom');
                              if (input) input.value = '';
                            }}
                            style={{
                              backgroundColor: '#6b7280',
                              color: 'white',
                              border: 'none',
                              padding: '0.625rem 1.25rem',
                              borderRadius: '8px',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = '#4b5563';
                              e.target.style.transform = 'translateY(-2px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = '#6b7280';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            Change File
                          </button>
                          <button
                            onClick={handleSubmitCustomEvaluation}
                            disabled={uploading || isReadOnly}
                            style={{
                              backgroundColor: uploading ? '#9ca3af' : '#10b981',
                              color: 'white',
                              border: 'none',
                              padding: '0.625rem 1.5rem',
                              borderRadius: '8px',
                              cursor: uploading || isReadOnly ? 'not-allowed' : 'pointer',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              transition: 'all 0.2s ease',
                              opacity: uploading || isReadOnly ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!uploading && !isReadOnly) {
                                e.target.style.backgroundColor = '#059669';
                                e.target.style.transform = 'translateY(-2px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!uploading && !isReadOnly) {
                                e.target.style.backgroundColor = '#10b981';
                                e.target.style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            {uploading ? 'Submitting...' : 'Submit Evaluation'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Drag & Drop Upload Area
                      <>
                        <div style={{
                          backgroundColor: '#fafafa',
                          border: '2px dashed #d1d5db',
                          borderRadius: '12px',
                          padding: '1.5rem 1rem',
                          textAlign: 'center',
                          cursor: uploading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.3s ease',
                          opacity: uploading ? 0.6 : 1
                        }}
                        onDragOver={(e) => {
                          if (!uploading) {
                            e.preventDefault();
                            e.currentTarget.style.backgroundColor = '#fef3f2';
                            e.currentTarget.style.borderColor = '#ec4899';
                            e.currentTarget.style.transform = 'scale(1.02)';
                          }
                        }}
                        onDragLeave={(e) => {
                          if (!uploading) {
                            e.currentTarget.style.backgroundColor = '#fafafa';
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.transform = 'scale(1)';
                          }
                        }}
                        onDrop={(e) => {
                          if (!uploading) {
                            e.preventDefault();
                            e.currentTarget.style.backgroundColor = '#fafafa';
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.transform = 'scale(1)';
                            const file = e.dataTransfer.files?.[0];
                            if (file) {
                              handleFileUpload({ target: { files: [file] } });
                            }
                          }
                        }}
                        onClick={() => {
                          if (!uploading) {
                            document.getElementById('file-input-custom')?.click();
                          }
                        }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <FaUpload style={{
                              fontSize: '2.5rem',
                              color: '#9ca3af',
                              marginBottom: '0.5rem'
                            }} />
                          </div>
                          <p style={{
                            margin: '0 0 0.25rem 0',
                            color: '#1f2937',
                            fontWeight: '700',
                            fontSize: '0.95rem'
                          }}>
                            {uploading ? 'Uploading...' : 'Drop your completed form here'}
                          </p>
                          <p style={{
                            margin: '0 0 0.25rem 0',
                            fontSize: '0.8rem',
                            color: '#6b7280'
                          }}>
                            or click to browse
                          </p>
                          <p style={{
                            margin: 0,
                            fontSize: '0.75rem',
                            color: '#9ca3af'
                          }}>
                            PDF, DOC, DOCX • Max 10MB
                          </p>
                          <input
                            id="file-input-custom"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                            disabled={uploading || isReadOnly}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* Built-In Evaluation - Criteria Form - MOVED OUTSIDE */}
        {false && isBuiltInEvaluation && (
          <div style={{ display: 'none' }}>
            {isBuiltInEvaluation && (
              <div className="task-detail-modal-description-section">
                <div className="task-detail-modal-section-header">
                  <div className="task-detail-modal-section-icon">⭐</div>
                  <h3>Evaluation Criteria</h3>
                </div>
                {evalData.criteria && Array.isArray(evalData.criteria) && evalData.criteria.length > 0 ? (
                  <div style={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1rem'
                  }}>
                    {evalData.criteria.map((criterion, idx) => (
                      <div key={criterion.id || idx} style={{
                        paddingBottom: '1rem',
                        marginBottom: '1rem',
                        borderBottom: idx < evalData.criteria.length - 1 ? '1px solid #f3f4f6' : 'none'
                      }}>
                        <div style={{ marginBottom: '0.5rem' }}>
                          <strong style={{ color: '#1f2937' }}>{criterion.name}</strong>
                          <span style={{ color: '#9ca3af', marginLeft: '0.5rem', fontSize: '0.85rem' }}>
                            Max: {criterion.max_points} points
                          </span>
                        </div>
                        <p style={{ color: '#6b7280', fontSize: '0.9rem', margin: '0.25rem 0' }}>
                          {criterion.description || 'No description provided'}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#9ca3af' }}>No criteria defined for this evaluation.</p>
                )}
              </div>
            )}

            {/* Evaluation Details Grid */}
            <div className="task-detail-modal-details-grid">
              <div className="task-detail-modal-detail-item">
                <label>Project:</label>
                <span>{project?.project_title || evalData.project_title || 'Not specified'}</span>
              </div>
              <div className="task-detail-modal-detail-item">
                <label>Phase:</label>
                <span>{phase?.title || phase?.phase_title || evalData.phase_name || evalData.phase_number || 'Not specified'}</span>
              </div>
              {evalData.total_points && (
                <div className="task-detail-modal-detail-item">
                  <label>Total Points:</label>
                  <span>{evalData.total_points}</span>
                </div>
              )}
            </div>
          </div>
        )}
        </div>

        {/* Navigation Buttons for Built-in Evaluations */}
        {isBuiltInEvaluation && (
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1.5rem',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            flex: '0 0 auto'
          }}>
            <button
              onClick={goToPreviousPage}
              disabled={!canGoPrevious()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: canGoPrevious() ? '#3b82f6' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: canGoPrevious() ? 'pointer' : 'not-allowed',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (canGoPrevious()) {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (canGoPrevious()) {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              ← Previous
            </button>

            {currentPage.startsWith('member-') && (
              <div style={{
                fontSize: '0.9rem',
                color: '#6b7280',
                fontWeight: '500'
              }}>
                {currentMemberIndex + 1} / {groupMembers.length}
              </div>
            )}

            {currentPage === 'submission' && (
              <button
                onClick={handleSubmitAggregatedEvaluation}
                disabled={uploading || isReadOnly}
                title={isReadOnly ? 'Submission period has ended' : ''}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: (uploading || isReadOnly) ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: (uploading || isReadOnly) ? 'not-allowed' : 'pointer',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!uploading) {
                    e.target.style.backgroundColor = '#059669';
                    e.target.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!uploading) {
                    e.target.style.backgroundColor = '#10b981';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                {uploading ? 'Submitting...' : '✓ Submit Evaluations'}
              </button>
            )}

            {!currentPage.startsWith('member-') && currentPage !== 'submission' && (
              <div style={{ width: '120px' }}></div>
            )}

            <button
              onClick={goToNextPage}
              disabled={!canGoNext()}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: canGoNext() ? '#3b82f6' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: canGoNext() ? 'pointer' : 'not-allowed',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (canGoNext()) {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (canGoNext()) {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              Next →
            </button>
          </div>
        )}

        {/* File Preview Modal */}
        {showFilePreview && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20000,
            padding: '2rem'
          }}
          onClick={() => setShowFilePreview(false)}
          >
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              width: '90%',
              maxWidth: '1200px',
              height: '90%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              {/* Preview Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb'
              }}>
                <div>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#1f2937'
                  }}>
                    Evaluation Form Preview
                  </h3>
                  <p style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.85rem',
                    color: '#6b7280'
                  }}>
                    {evaluation.file_name || evaluation.custom_file_name || 'evaluation-form.pdf'}
                  </p>
                </div>
                <button
                  onClick={() => setShowFilePreview(false)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '1.25rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#dc2626';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#ef4444';
                  }}
                >
                  <FaTimes />
                </button>
              </div>

              {/* Preview Content */}
              <div style={{
                flex: 1,
                overflow: 'hidden',
                backgroundColor: '#525252'
              }}>
                <iframe
                  src={evaluation.file_url || evaluation.custom_file_url}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none'
                  }}
                  title="Evaluation Form Preview"
                />
              </div>

              {/* Preview Footer */}
              <div style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'flex-end',
                padding: '1rem 1.5rem',
                borderTop: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb'
              }}>
                <button
                  onClick={handleDownloadPDF}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#2563eb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#3b82f6';
                  }}
                >
                  <FaDownload /> Download
                </button>
                <button
                  onClick={() => setShowFilePreview(false)}
                  style={{
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#4b5563';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#6b7280';
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        .task-detail-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(4px);
        }

        .task-detail-modal-container {
          background: white;
          border-radius: 15px;
          width: 90%;
          max-width: 1200px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .task-detail-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.9rem 1.2rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .task-detail-modal-header-left {
          display: flex;
          align-items: center;
        }

        .task-detail-modal-header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .task-detail-modal-close-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          background: #ef4444;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .task-detail-modal-close-btn:hover {
          background: #dc2626;
        }

        .task-detail-modal-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .task-detail-modal-left-column {
          flex: 1.53;
          padding: 2rem;
          overflow-y: auto;
          border-right: 1px solid #e5e7eb;
        }

        .task-detail-modal-right-column {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
          background: #f9fafb;
        }

        .task-detail-modal-title-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .task-detail-modal-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #111827;
          margin: 0;
          line-height: 1.3;
        }

        .task-detail-modal-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 2rem;
          margin-top: 1rem;
        }

        .task-detail-modal-pill {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          border: 1px solid #d1d5db;
          border-radius: 20px;
          font-size: 0.875rem;
          color: #374151;
        }

        .task-detail-modal-pill-icon {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .task-detail-modal-pill-label {
          font-weight: 500;
          color: #6b7280;
        }

        .task-detail-modal-pill-value {
          font-weight: 600;
          color: #111827;
        }

        .task-detail-modal-description-section {
          margin-bottom: 2rem;
        }

        .task-detail-modal-section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .task-detail-modal-section-icon {
          font-size: 1.25rem;
          color: #6b7280;
        }

        .task-detail-modal-section-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .task-detail-modal-description-content {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 1rem;
          min-height: 120px;
          max-height: 200px;
          overflow-y: auto;
        }

        .task-detail-modal-description-content p {
          margin: 0;
          color: #374151;
          line-height: 1.6;
        }

        .task-detail-modal-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .task-detail-modal-detail-item {
          background: white;
          padding: 1rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
        }

        .task-detail-modal-detail-item label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          display: block;
          margin-bottom: 0.5rem;
        }

        .task-detail-modal-detail-item span {
          font-size: 0.95rem;
          color: #111827;
          display: block;
        }

        .task-detail-modal-file-upload-section {
          margin-bottom: 2rem;
        }

        .task-detail-modal-file-upload-area {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 1.5rem;
        }

        .task-detail-modal-separator {
          height: 1px;
          background: #e5e7eb;
          margin: 1.5rem 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .modal-loading-overlay {
          animation: fadeIn 0.2s ease-in-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default EvaluationModal;

