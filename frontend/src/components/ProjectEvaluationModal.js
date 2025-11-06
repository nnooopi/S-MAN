import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaCalendarAlt, FaClock, FaUser, FaCheckCircle, FaExclamationTriangle, FaDownload, FaUpload, FaSave, FaFileAlt, FaClipboardList, FaCheckDouble, FaListAlt, FaUsers, FaCheck } from 'react-icons/fa';
import dayjs from 'dayjs';

// Helper function to get profile image URL
const getProfileImageUrl = (member) => {
  if (!member?.profile_image_url) return null;
  return member.profile_image_url;
};

const ProjectEvaluationModal = ({ isOpen, onClose, evaluation, project, groupData, currentUser }) => {
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [currentMemberIndex, setCurrentMemberIndex] = useState(-1);
  
  // Aggregated evaluation data structure (matches JSONB format)
  const [evaluationData, setEvaluationData] = useState({
    evaluated_members: {},
    progress: {},
    aggregate_total: 0,
    last_updated: null
  });
  
  const [saveStatus, setSaveStatus] = useState('idle'); // idle, saving, saved, error
  const [saveError, setSaveError] = useState(null);
  
  // File upload state for custom evaluations
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // Auto-save debounce timer
  const autoSaveTimer = useRef(null);
  
  // Determine if this is a custom evaluation
  const isCustomEvaluation = evaluation?.is_custom_evaluation === true;
  const isBuiltInEvaluation = evaluation?.is_custom_evaluation === false;

  useEffect(() => {
    if (isOpen && evaluation) {
      setIsModalLoading(true);
      
      // ✅ FIX: Reset evaluationData state when modal opens to prevent showing previous evaluation's data
      console.log('🔄 [PROJECT MODAL OPEN] Resetting evaluation data for project:', evaluation.project_id, evaluation.project_title);
      setEvaluationData({
        evaluated_members: {},
        progress: {},
        aggregate_total: 0
      });
      
      // Load group members for evaluation
      if (groupData && groupData.members && currentUser) {
        console.log('📋 Current User ID:', currentUser.id);
        console.log('📋 All members before filter:', groupData.members.length);
        
        // Filter out current user from members by comparing student_id
        const otherMembers = (groupData.members || []).filter(m => {
          const isNotCurrentUser = m.student_id !== currentUser.id;
          console.log(`Member: ${m.full_name || m.name} - Include: ${isNotCurrentUser}`);
          return isNotCurrentUser;
        });
        
        console.log('✅ Filtered members (excluding current user):', otherMembers.length);
        setGroupMembers(otherMembers);
        
        // Initialize aggregated evaluation structure
        const evaluatedMembers = {};
        const progress = {};
        
        otherMembers.forEach(member => {
          evaluatedMembers[member.id] = {
            criteria: {},
            total: 0
          };
          progress[member.id] = {
            completed_criteria: 0,
            total_criteria: evaluation.evaluation_criteria?.length || 0
          };
        });
        
        setEvaluationData({
          evaluated_members: evaluatedMembers,
          progress: progress,
          aggregate_total: 0
        });
      } else if (groupData && groupData.members && !currentUser) {
        console.warn('⚠️ currentUser not provided, showing all members');
        setGroupMembers(groupData.members);
      }
      
      // Load existing submission data if available (for project evaluation cards)
      if (evaluation.submission_data) {
        console.log('✅ Loading existing submission data:', evaluation.submission_data);
        setEvaluationData(evaluation.submission_data);
      } else if (evaluation.id && !evaluation.id.startsWith('project-eval-')) {
        // Only load existing evaluation if it has a valid submission ID (not a project-eval card ID)
        loadExistingEvaluation();
      } else {
        console.log('ℹ️ No submission data to load for this project evaluation');
      }
      
      setTimeout(() => setIsModalLoading(false), 300);
    }
  }, [isOpen, evaluation, groupData, currentUser]);

  // Load existing evaluation submission
  const loadExistingEvaluation = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || !evaluation.id) return;

      const response = await fetch(`/api/evaluations/${evaluation.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Existing evaluation loaded:', data);
        setEvaluationData(data.evaluation_data || {
          evaluated_members: {},
          progress: {},
          aggregate_total: 0,
          last_updated: null
        });
      }
    } catch (error) {
      console.error('Error loading existing evaluation:', error);
    }
  };

  // Auto-save when evaluation data changes
  // ⚠️ DISABLED for project evaluations - only manual submit supported
  useEffect(() => {
    if (!isOpen || !evaluation) return;
    
    // Skip auto-save for project evaluations (no save endpoint yet)
    console.log('📝 [AUTO-SAVE] Skipping auto-save for project evaluations');
    return;

    // Clear existing timer
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    // Set new timer for auto-save (2 second debounce)
    autoSaveTimer.current = setTimeout(() => {
      autoSaveEvaluation();
    }, 2000);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [evaluationData]);

  // Auto-save evaluation
  // ⚠️ DISABLED for project evaluations - only manual submit supported
  const autoSaveEvaluation = async () => {
    try {
      setSaveStatus('saving');
      const token = localStorage.getItem('token');
      
      if (!token || !evaluation || !project) return;

      const payload = {
        evaluation_data: evaluationData,
        status: 'in_progress'
      };

      const response = await fetch(`/api/student/evaluations/${evaluation.id}/save`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        console.log('✅ Evaluation auto-saved');
      } else {
        setSaveStatus('error');
        const error = await response.json();
        setSaveError(error.message || 'Failed to save evaluation');
      }
    } catch (error) {
      console.error('Error auto-saving evaluation:', error);
      setSaveStatus('error');
      setSaveError(error.message);
    }
  };

  const getProjectEvaluationStatus = () => {
    const now = new Date();
    const availableFrom = evaluation?.evaluation_available_from ? new Date(evaluation.evaluation_available_from) : null;
    const dueDate = evaluation?.due_date ? new Date(evaluation.due_date) : null;
    
    // ✅ FIX: Check if already submitted from the evaluation card status
    if (evaluation?.status === 'submitted') return 'submitted';
    
    // ✅ FIX: Check if there's ACTUAL submission data (not just initialized empty structure)
    // Only consider it submitted if:
    // 1. Has submission_date OR submitted_at timestamp
    // 2. Has actual scores filled in (at least one member with criteria scores)
    if (evaluationData?.submitted_at || evaluation?.submission_date) {
      return 'submitted';
    }
    
    // Check if there are actual scores (not just empty initialized structure)
    if (evaluationData?.evaluated_members && Object.keys(evaluationData.evaluated_members).length > 0) {
      const hasActualScores = Object.values(evaluationData.evaluated_members).some(member => 
        member?.criteria && Object.keys(member.criteria).length > 0 && member.total > 0
      );
      // Only mark as submitted if the data came from the card (has submission_id)
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
    const status = getProjectEvaluationStatus();
    switch(status) {
      case 'upcoming': return '#a855f7'; // Light violet
      case 'ongoing': return '#7c3aed'; // Darker violet
      case 'submitted': return '#6d28d9'; // Even darker violet
      case 'missed': return '#5b21b6'; // Darkest violet
      default: return '#a855f7';
    }
  };

  const getStatusPillText = () => {
    const status = getProjectEvaluationStatus();
    switch(status) {
      case 'upcoming': return 'Upcoming';
      case 'ongoing': return 'Ongoing';
      case 'submitted': return 'Submitted';
      case 'missed': return 'Missed';
      default: return status;
    }
  };

  // ✅ Check if evaluation is already submitted (read-only mode)
  const isSubmitted = getProjectEvaluationStatus() === 'submitted';

  // Handle criterion score change for a member
  const handleCriterionScoreChange = (memberId, criterionId, score) => {
    const numScore = parseFloat(score) || 0;
    const criterion = evaluation.evaluation_criteria.find(c => c.id === criterionId);
    const maxPoints = criterion?.max_points || 0;

    // Validate score is within range
    if (numScore < 0 || numScore > maxPoints) return;

    setEvaluationData(prev => {
      const updated = { ...prev };
      if (!updated.evaluated_members[memberId]) {
        updated.evaluated_members[memberId] = { criteria: {}, total: 0 };
      }
      
      updated.evaluated_members[memberId].criteria[criterionId] = numScore;
      
      // Recalculate total for this member
      const memberCriteria = updated.evaluated_members[memberId].criteria;
      let memberTotal = 0;
      Object.values(memberCriteria).forEach(score => {
        memberTotal += parseFloat(score) || 0;
      });
      updated.evaluated_members[memberId].total = memberTotal;
      
      // Update progress
      const completedCriteria = Object.keys(memberCriteria).filter(
        cId => memberCriteria[cId] !== undefined && memberCriteria[cId] !== null
      ).length;
      updated.progress[memberId] = {
        completed_criteria: completedCriteria,
        total_criteria: evaluation.evaluation_criteria?.length || 0
      };
      
      // Update aggregate total
      let aggregateTotal = 0;
      Object.values(updated.evaluated_members).forEach(member => {
        aggregateTotal += member.total || 0;
      });
      updated.aggregate_total = aggregateTotal;
      updated.last_updated = new Date().toISOString();
      
      return updated;
    });
  };

  // Navigate to next member
  const handleNextMember = () => {
    if (currentMemberIndex < groupMembers.length - 1) {
      setCurrentMemberIndex(currentMemberIndex + 1);
    }
  };

  // Navigate to previous member
  const handlePreviousMember = () => {
    if (currentMemberIndex > 0) {
      setCurrentMemberIndex(currentMemberIndex - 1);
    }
  };

  // Handle file upload for custom evaluations
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds 10MB limit');
      return;
    }

    // Validate file type
    const allowedTypes = ['.pdf', '.doc', '.docx'];
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      alert('Only PDF, DOC, and DOCX files are allowed');
      return;
    }

    setSelectedFile(file);
    setUploadedFileName(file.name);
  };

  // Handle view PDF for custom evaluations
  const handleViewPDF = () => {
    // Check multiple property names for file URL (different sources may use different names)
    const fileUrl = evaluation?.custom_file_url || evaluation?.evaluation_form_file_url;
    
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    } else {
      alert('No evaluation form file available');
      console.error('❌ No file URL found in evaluation:', evaluation);
    }
  };

  // Handle download PDF for custom evaluations
  const handleDownloadPDF = async () => {
    // Check multiple property names for file URL and name
    const fileUrl = evaluation?.custom_file_url || evaluation?.evaluation_form_file_url;
    const fileName = evaluation?.custom_file_name || evaluation?.evaluation_form_file_name || evaluation?.file_name || 'evaluation-form.pdf';
    
    if (!fileUrl) {
      alert('No evaluation form file available');
      console.error('❌ No file URL found in evaluation:', evaluation);
      return;
    }

    try {
      const response = await fetch(fileUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      console.log('✅ File downloaded successfully:', fileName);
    } catch (error) {
      console.error('❌ Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  // Submit custom evaluation
  const handleSubmitCustomEvaluation = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      
      // Upload file to Supabase Storage
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('project_id', project?.id);
      formData.append('group_id', groupData?.group_id || groupData?.id);
      formData.append('project_evaluation_form_id', evaluation?.project_evaluation_form_id);

      const formId = evaluation?.project_evaluation_form_id;
      if (!formId) {
        setSaveStatus('error');
        setSaveError('Missing project evaluation form ID');
        console.error('❌ No project_evaluation_form_id found in evaluation:', evaluation);
        setUploading(false);
        return;
      }

      const endpoint = `${process.env.REACT_APP_API_URL || ''}/api/project-evaluations/${formId}/submit-custom`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Custom evaluation submitted successfully:', data);
        alert('Evaluation submitted successfully!');
        setTimeout(() => {
          onClose(); // Close modal - parent will refresh data
        }, 1000);
      } else {
        const error = await response.json();
        console.error('❌ Submit error:', error);
        alert(error.message || error.error || 'Failed to submit evaluation');
      }
    } catch (error) {
      console.error('Error submitting custom evaluation:', error);
      alert('Failed to submit evaluation');
    } finally {
      setUploading(false);
    }
  };

  // Submit evaluation
  const handleSubmitEvaluation = async () => {
    try {
      setSaveStatus('saving');
      const token = localStorage.getItem('token');
      
      if (!token || !evaluation || !project) {
        setSaveStatus('error');
        setSaveError('Missing required information');
        return;
      }

      // Check if all members have been evaluated
      const allMembersComplete = groupMembers.every(member => {
        const memberEval = evaluationData.evaluated_members[member.id];
        const completedCount = memberEval ? 
          Object.keys(memberEval.criteria).filter(cId => 
            memberEval.criteria[cId] !== undefined && memberEval.criteria[cId] !== null
          ).length : 0;
        return completedCount === (evaluation.evaluation_criteria?.length || 0);
      });

      if (!allMembersComplete) {
        setSaveStatus('error');
        setSaveError('Please complete evaluation for all members');
        return;
      }

      // ✅ FIX: Add required IDs to evaluation data (similar to phase evaluations)
      const completedEvalData = {
        ...evaluationData,
        project_id: project?.id,
        group_id: groupData?.group_id || groupData?.id, // ✅ FIX: Use group_id first (course_groups.id), not id (course_group_members.id)
        project_evaluation_form_id: evaluation?.project_evaluation_form_id // ✅ Use the actual form ID
      };

      const payload = {
        evaluation_data: completedEvalData,
        status: 'submitted'
      };

      console.log('📊 [PROJECT SUBMIT DEBUG] Payload:', payload);
      console.log('📊 [PROJECT SUBMIT DEBUG] Using form ID:', evaluation?.project_evaluation_form_id);
      console.log('📊 [PROJECT SUBMIT DEBUG] Full evaluation object:', evaluation);
      console.log('📊 [PROJECT SUBMIT DEBUG] project:', project);
      console.log('📊 [PROJECT SUBMIT DEBUG] groupData:', groupData);
      console.log('📊 [PROJECT SUBMIT DEBUG] Extracted IDs:', {
        project_id: project?.id,
        group_id: groupData?.id || groupData?.group_id,
        form_id: evaluation?.project_evaluation_form_id
      });

      // ✅ FIX: Use correct endpoint with actual form ID (not card ID)
      const formId = evaluation?.project_evaluation_form_id;
      if (!formId) {
        setSaveStatus('error');
        setSaveError('Missing project evaluation form ID');
        console.error('❌ No project_evaluation_form_id found in evaluation:', evaluation);
        return;
      }
      
      const endpoint = `${process.env.REACT_APP_API_URL || ''}/api/project-evaluations/${formId}/submit`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setSaveStatus('saved');
        console.log('✅ Project evaluation submitted successfully');
        setTimeout(() => {
          onClose(); // Close modal - parent will refresh data
          setSaveStatus('idle');
        }, 1500);
      } else {
        setSaveStatus('error');
        const error = await response.json();
        setSaveError(error.message || error.error || 'Failed to submit evaluation');
        console.error('❌ Submit error:', error);
      }
    } catch (error) {
      console.error('Error submitting evaluation:', error);
      setSaveStatus('error');
      setSaveError(error.message);
    }
  };

  if (!isOpen || !evaluation) return null;

  if (isModalLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e0e0e0',
            borderTop: '3px solid #34656D',
            borderRadius: '50%',
            margin: '0 auto 1rem',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ color: '#666', fontWeight: '500' }}>Loading evaluation...</div>
        </div>
      </div>
    );
  }

  // Determine current page based on currentMemberIndex
  // -1 = project details, >= 0 = member evaluation, -2 = submission review
  const isProjectDetailsPage = currentMemberIndex === -1;
  const isSubmissionPage = currentMemberIndex === -2;
  const currentMember = !isProjectDetailsPage && !isSubmissionPage ? groupMembers[currentMemberIndex] : null;
  const currentMemberEval = currentMember ? evaluationData.evaluated_members[currentMember.id] : null;
  const memberProgress = currentMember ? evaluationData.progress[currentMember.id] : null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        width: '100%',
        maxWidth: '1100px',
        height: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          backgroundColor: '#a855f7',
          borderBottom: 'none',
          padding: '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{
              margin: '0',
              fontSize: '1.3rem',
              fontWeight: '600',
              color: '#ffffff',
              textShadow: 'none',
              WebkitTextFillColor: '#ffffff',
              filter: 'none'
            }}>
              Project Evaluation: {project?.project_title || project?.title || 'Project'}
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
              {getProjectEvaluationStatus() === 'upcoming' ? <FaClock style={{ fontSize: '0.65rem' }} /> : 
               getProjectEvaluationStatus() === 'ongoing' ? <FaClock style={{ fontSize: '0.65rem' }} /> : 
               getProjectEvaluationStatus() === 'submitted' ? <FaCheckDouble style={{ fontSize: '0.65rem' }} /> : 
               getProjectEvaluationStatus() === 'missed' ? <FaTimes style={{ fontSize: '0.65rem' }} /> : null}
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

        {/* ✅ Read-only Banner when submitted */}
        {isSubmitted && (
          <div style={{
            backgroundColor: '#dcfce7',
            borderBottom: '2px solid #86efac',
            padding: '1rem 2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            color: '#166534',
            fontSize: '0.95rem',
            fontWeight: '500'
          }}>
            <FaCheckDouble style={{ fontSize: '1.1rem', color: '#22c55e' }} />
            <span>
              This evaluation has been submitted and is now <strong>read-only</strong>. Changes cannot be made.
            </span>
          </div>
        )}

        {/* Main Content - Conditional Layout Based on Evaluation Type */}
        {isBuiltInEvaluation ? (
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          overflow: 'hidden'
        }}>
          
          {/* Left Sidebar - Navigation */}
          <div style={{
            borderRight: '1px solid #e0e0e0',
            overflow: 'auto',
            backgroundColor: 'white',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Project Details Button */}
            <button
              onClick={() => setCurrentMemberIndex(-1)}
              style={{
                backgroundColor: isProjectDetailsPage ? '#f0f0f0' : 'white',
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
                margin: 0,
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (isProjectDetailsPage !== true) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (isProjectDetailsPage !== true) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              <FaFileAlt style={{ fontSize: '1rem', flexShrink: 0, color: '#666' }} />
              <span>Project Details</span>
            </button>

            {/* Members List */}
            <div style={{ borderBottom: '1px solid #e0e0e0' }}>
              {groupMembers.length === 0 ? (
                <div style={{
                  padding: '1rem',
                  fontSize: '0.85rem',
                  color: '#999',
                  textAlign: 'center'
                }}>
                  No members
                </div>
              ) : (
                groupMembers.map((member, index) => {
                  const memberEval = evaluationData.evaluated_members[member.id];
                  const isComplete = memberEval && evaluation.evaluation_criteria && 
                    Object.keys(memberEval.criteria).length === evaluation.evaluation_criteria.length;
                  
                  return (
                    <button
                      key={member.id}
                      onClick={() => setCurrentMemberIndex(index)}
                      style={{
                        backgroundColor: currentMemberIndex === index ? '#f0f0f0' : 'white',
                        color: '#333',
                        border: 'none',
                        borderBottom: '1px solid #e0e0e0',
                        padding: '12px 14px',
                        borderRadius: '0',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        margin: 0,
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        if (currentMemberIndex !== index) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (currentMemberIndex !== index) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                      title={`Evaluating: ${member.full_name || member.name}`}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', flex: 1, minWidth: 0 }}>
                        <FaUser style={{ fontSize: '0.9rem', flexShrink: 0, color: '#666', marginTop: '2px' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>Evaluating Member:</div>
                          <div style={{ fontWeight: '500', fontSize: '0.9rem', color: '#333' }}>{member.full_name || member.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>{member.position || member.role || 'Team Member'}</div>
                        </div>
                      </div>
                      {isComplete && (
                        <FaCheckCircle style={{ fontSize: '0.78rem', color: '#10b981', marginLeft: '4px', flexShrink: 0, marginTop: '3px' }} />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Review & Submit Button */}
            <button
              onClick={() => setCurrentMemberIndex(-2)}
              style={{
                backgroundColor: isSubmissionPage ? '#f0f0f0' : 'white',
                color: '#333',
                border: 'none',
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
                margin: 0,
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (isSubmissionPage !== true) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
              onMouseLeave={(e) => {
                if (isSubmissionPage !== true) {
                  e.currentTarget.style.backgroundColor = 'white';
                }
              }}
            >
              <FaCheckCircle style={{ fontSize: '1rem', flexShrink: 0, color: '#666' }} />
              <span>Review & Submit</span>
            </button>
          </div>

          {/* Right Content Area */}
          <div style={{
            overflow: 'auto',
            padding: '2rem'
          }}>
            {isProjectDetailsPage && (
              <div>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#1a1a1a'
                }}>
                  Project Details
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem'
                    }}>
                      Project Title
                    </div>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#1a1a1a'
                    }}>
                      {project?.project_title || project?.title || 'N/A'}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '1rem',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem'
                    }}>
                      Total Points Available
                    </div>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: '#1a1a1a'
                    }}>
                      {evaluation.evaluation_total_points || 100} points
                    </div>
                  </div>
                </div>

                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  padding: '1rem',
                  border: '1px solid #e5e7eb',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    marginBottom: '0.5rem'
                  }}>
                    Team Members
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    color: '#1a1a1a'
                  }}>
                    {groupMembers.length} members to evaluate
                  </div>
                </div>

                <div>
                  <h4 style={{
                    margin: '0 0 1rem 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#1a1a1a'
                  }}>
                    Evaluation Criteria
                  </h4>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {evaluation.evaluation_criteria && evaluation.evaluation_criteria.length > 0 ? (
                      evaluation.evaluation_criteria
                        .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                        .map((criterion, idx) => (
                          <div key={criterion.id} style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: '8px',
                            padding: '1rem',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '0.5rem'
                            }}>
                              <h5 style={{
                                margin: '0',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                color: '#1a1a1a'
                              }}>
                                {idx + 1}. {criterion.name}
                              </h5>
                              <span style={{
                                backgroundColor: '#e0f2fe',
                                color: '#0369a1',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '600'
                              }}>
                                {criterion.max_points} pts
                              </span>
                            </div>
                            {criterion.description && (
                              <p style={{
                                margin: 0,
                                fontSize: '0.85rem',
                                color: '#6b7280',
                                lineHeight: '1.4'
                              }}>
                                {criterion.description}
                              </p>
                            )}
                          </div>
                        ))
                    ) : (
                      <div style={{
                        textAlign: 'center',
                        padding: '2rem',
                        color: '#999'
                      }}>
                        No evaluation criteria available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isProjectDetailsPage && !isSubmissionPage && currentMember && (
              <div>
                {/* Member Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '1rem',
                  marginBottom: '2rem',
                  paddingBottom: '1.5rem',
                  borderBottom: '1px solid #e0e0e0'
                }}>
                  {currentMember?.profile_image_url && (
                    <img
                      src={currentMember.profile_image_url}
                      alt={currentMember.full_name || currentMember.name}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                    />
                  )}
                  <div>
                    <h3 style={{
                      margin: '0 0 0.25rem 0',
                      fontSize: '1.3rem',
                      fontWeight: '600',
                      color: '#1a1a1a'
                    }}>
                      {currentMember?.full_name || currentMember?.name}
                    </h3>
                    <div style={{
                      fontSize: '0.9rem',
                      color: '#666',
                      marginBottom: '0.5rem'
                    }}>
                      Member {currentMemberIndex + 1} of {groupMembers.length}
                    </div>
                    {memberProgress && (
                      <div style={{
                        fontSize: '0.85rem',
                        color: '#666'
                      }}>
                        {memberProgress.completed_criteria} of {memberProgress.total_criteria} criteria completed
                      </div>
                    )}
                  </div>
                </div>

                {/* Evaluation Criteria Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1.5rem'
                }}>
                  {evaluation.evaluation_criteria && evaluation.evaluation_criteria.length > 0 ? (
                    evaluation.evaluation_criteria
                      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
                      .map((criterion) => {
                        const currentScore = currentMemberEval?.criteria[criterion.id];
                        const isFilled = currentScore !== undefined && currentScore !== null && currentScore !== '';

                        return (
                          <div key={criterion.id} style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: '12px',
                            padding: '1rem',
                            border: '1px solid #e5e7eb'
                          }}>
                            <h4 style={{
                              margin: '0 0 0.5rem 0',
                              fontSize: '0.95rem',
                              fontWeight: '600',
                              color: '#1a1a1a',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              {criterion.name}
                              {isFilled && <FaCheck style={{ color: '#10b981', fontSize: '0.75rem' }} />}
                            </h4>
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
                              gap: '0.5rem',
                              backgroundColor: '#fff',
                              borderRadius: '6px',
                              padding: '0.5rem 0.75rem',
                              border: '1px solid #ddd'
                            }}>
                              <input
                                type="number"
                                min="0"
                                max={criterion.max_points || 0}
                                value={currentScore || ''}
                                onChange={(e) => handleCriterionScoreChange(currentMember.id, criterion.id, e.target.value)}
                                placeholder="0"
                                disabled={isSubmitted}  // ✅ Read-only when submitted
                                style={{
                                  width: '60px',
                                  border: 'none',
                                  textAlign: 'center',
                                  fontSize: '1rem',
                                  fontWeight: '600',
                                  outline: 'none',
                                  cursor: isSubmitted ? 'not-allowed' : 'text',
                                  opacity: isSubmitted ? 0.6 : 1
                                }}
                              />
                              <span style={{
                                color: '#999',
                                fontSize: '0.85rem'
                              }}>
                                / {criterion.max_points || 0}
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

                {/* Member Total */}
                {currentMemberEval && (
                  <div style={{
                    marginTop: '2rem',
                    padding: '1.5rem',
                    backgroundColor: '#f0fdf4',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Total Points
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#10b981'
                    }}>
                      {currentMemberEval.total || 0} / {evaluation.evaluation_total_points || 0}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isSubmissionPage && (
              <div>
                <h3 style={{
                  margin: '0 0 1.5rem 0',
                  fontSize: '1.3rem',
                  fontWeight: '600',
                  color: '#1a1a1a'
                }}>
                  Review & Submit
                </h3>

                {/* Summary Stats */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem'
                    }}>
                      Members Evaluated
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#34656D'
                    }}>
                      {groupMembers.filter(m => {
                        const memberEvalData = evaluationData.evaluated_members[m.id];
                        const completed = memberEvalData && Object.keys(memberEvalData.criteria).length === (evaluation.evaluation_criteria?.length || 0);
                        return completed;
                      }).length} / {groupMembers.length}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem'
                    }}>
                      Aggregate Total
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#10b981'
                    }}>
                      {evaluationData.aggregate_total || 0} pts
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: '#f9fafb',
                    borderRadius: '8px',
                    padding: '1rem',
                    border: '1px solid #e5e7eb',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: '0.85rem',
                      color: '#6b7280',
                      marginBottom: '0.5rem'
                    }}>
                      Max Available
                    </div>
                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      color: '#6b7280'
                    }}>
                      {(evaluation.evaluation_total_points || 100) * groupMembers.length} pts
                    </div>
                  </div>
                </div>

                {/* Member Scores Table */}
                <div style={{
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  overflow: 'hidden'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem'
                  }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f0f0f0', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontWeight: '600',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }}>
                          Member Name
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }}>
                          Score
                        </th>
                        <th style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: '600',
                          color: '#1a1a1a',
                          fontSize: '0.9rem'
                        }}>
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupMembers.map((member, idx) => {
                        const memberEval = evaluationData.evaluated_members[member.id];
                        const isComplete = memberEval && Object.keys(memberEval.criteria).length === (evaluation.evaluation_criteria?.length || 0);
                        
                        return (
                          <tr key={member.id} style={{
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafbfc'
                          }}>
                            <td style={{
                              padding: '1rem',
                              color: '#1a1a1a'
                            }}>
                              {member.full_name || member.name}
                            </td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center',
                              color: '#1a1a1a',
                              fontWeight: '600'
                            }}>
                              {memberEval?.total || 0} / {evaluation.evaluation_total_points || 100}
                            </td>
                            <td style={{
                              padding: '1rem',
                              textAlign: 'center'
                            }}>
                              <span style={{
                                backgroundColor: isComplete ? '#d1fae5' : '#fee2e2',
                                color: isComplete ? '#065f46' : '#991b1b',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                display: 'inline-block'
                              }}>
                                {isComplete ? '✓ Complete' : '✗ Incomplete'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
        ) : (
          // Custom Evaluation - Full Width Centered Layout
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            {/* Full Width Content */}
            <div style={{ flex: 1 }}>
              {/* Custom Evaluation - Centered UI */}
              {isCustomEvaluation && (
                <div className="task-detail-modal-description-section">
                  {/* Single Centered Section */}
                  <div style={{
                    backgroundColor: 'transparent',
                    padding: '2rem 1rem',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '1rem',
                    maxWidth: '700px',
                    margin: '0 auto'
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
                        Project Evaluation Form
                      </h3>
                      <p style={{
                        margin: 0,
                        color: '#6b7280',
                        fontSize: '0.85rem',
                        maxWidth: '500px',
                        lineHeight: '1.3'
                      }}>
                        {evaluation.custom_file_name || evaluation.evaluation_form_file_name || evaluation.file_name || 'project-evaluation-form.pdf'}
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
                      {evaluation.evaluation_total_points && (
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
                          <span>{evaluation.evaluation_total_points} Points</span>
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
                          lineHeight: '1.4',
                          textAlign: 'left'
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
                                const input = document.getElementById('file-input-project-custom');
                                if (input) input.value = '';
                              }}
                              disabled={isSubmitted}
                              style={{
                                backgroundColor: '#6b7280',
                                color: 'white',
                                border: 'none',
                                padding: '0.625rem 1.25rem',
                                borderRadius: '8px',
                                cursor: isSubmitted ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                transition: 'all 0.2s ease',
                                opacity: isSubmitted ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (!isSubmitted) {
                                  e.target.style.backgroundColor = '#4b5563';
                                  e.target.style.transform = 'translateY(-2px)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSubmitted) {
                                  e.target.style.backgroundColor = '#6b7280';
                                  e.target.style.transform = 'translateY(0)';
                                }
                              }}
                            >
                              Change File
                            </button>
                            <button
                              onClick={handleSubmitCustomEvaluation}
                              disabled={uploading || isSubmitted}
                              style={{
                                backgroundColor: uploading ? '#9ca3af' : '#10b981',
                                color: 'white',
                                border: 'none',
                                padding: '0.625rem 1.5rem',
                                borderRadius: '8px',
                                cursor: uploading || isSubmitted ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: '600',
                                transition: 'all 0.2s ease',
                                opacity: uploading || isSubmitted ? 0.6 : 1
                              }}
                              onMouseEnter={(e) => {
                                if (!uploading && !isSubmitted) {
                                  e.target.style.backgroundColor = '#059669';
                                  e.target.style.transform = 'translateY(-2px)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!uploading && !isSubmitted) {
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
                            cursor: uploading || isSubmitted ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s ease',
                            opacity: uploading || isSubmitted ? 0.6 : 1
                          }}
                          onDragOver={(e) => {
                            if (!uploading && !isSubmitted) {
                              e.preventDefault();
                              e.currentTarget.style.backgroundColor = '#fef3f2';
                              e.currentTarget.style.borderColor = '#ec4899';
                              e.currentTarget.style.transform = 'scale(1.02)';
                            }
                          }}
                          onDragLeave={(e) => {
                            if (!uploading && !isSubmitted) {
                              e.currentTarget.style.backgroundColor = '#fafafa';
                              e.currentTarget.style.borderColor = '#d1d5db';
                              e.currentTarget.style.transform = 'scale(1)';
                            }
                          }}
                          onDrop={(e) => {
                            if (!uploading && !isSubmitted) {
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
                            if (!uploading && !isSubmitted) {
                              document.getElementById('file-input-project-custom')?.click();
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
                              id="file-input-project-custom"
                              type="file"
                              accept=".pdf,.doc,.docx"
                              style={{ display: 'none' }}
                              onChange={handleFileUpload}
                              disabled={uploading || isSubmitted}
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

        {/* Footer - Only show for Built-in Evaluations */}
        {isBuiltInEvaluation && (
        <div style={{
          backgroundColor: '#f9fafb',
          borderTop: '1px solid #e5e7eb',
          padding: '1.5rem',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'space-between',
          alignItems: 'center',
          flex: '0 0 auto'
        }}>
          <button
            onClick={handlePreviousMember}
            disabled={currentMemberIndex <= -1}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: currentMemberIndex <= -1 ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: currentMemberIndex <= -1 ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (currentMemberIndex > -1) {
                e.target.style.backgroundColor = '#2563eb';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentMemberIndex > -1) {
                e.target.style.backgroundColor = '#3b82f6';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            ← Previous
          </button>

          {!isProjectDetailsPage && !isSubmissionPage && (
            <div style={{
              fontSize: '0.9rem',
              color: '#6b7280',
              fontWeight: '500',
              textAlign: 'center'
            }}>
              {currentMemberIndex + 1} / {groupMembers.length}
            </div>
          )}

          {/* ✅ Hide Submit button when already submitted */}
          {isSubmissionPage && !isSubmitted && (
            <button
              onClick={handleSubmitEvaluation}
              disabled={saveStatus === 'saving'}
              style={{
                padding: '0.75rem 2rem',
                backgroundColor: saveStatus === 'saving' ? '#d1d5db' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: saveStatus === 'saving' ? 'not-allowed' : 'pointer',
                fontSize: '0.95rem',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                if (saveStatus !== 'saving') {
                  e.target.style.backgroundColor = '#059669';
                  e.target.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (saveStatus !== 'saving') {
                  e.target.style.backgroundColor = '#10b981';
                  e.target.style.transform = 'translateY(0)';
                }
              }}
            >
              {saveStatus === 'saving' ? 'Submitting...' : '✓ Submit Evaluations'}
            </button>
          )}

          <button
            onClick={handleNextMember}
            disabled={currentMemberIndex >= groupMembers.length - 1 && !isSubmissionPage}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: (currentMemberIndex >= groupMembers.length - 1 && !isSubmissionPage) ? '#d1d5db' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: (currentMemberIndex >= groupMembers.length - 1 && !isSubmissionPage) ? 'not-allowed' : 'pointer',
              fontSize: '0.95rem',
              fontWeight: '600',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (currentMemberIndex < groupMembers.length - 1 || isSubmissionPage) {
                e.target.style.backgroundColor = '#2563eb';
                e.target.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentMemberIndex < groupMembers.length - 1 || isSubmissionPage) {
                e.target.style.backgroundColor = '#3b82f6';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            Next →
          </button>
        </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ProjectEvaluationModal;
