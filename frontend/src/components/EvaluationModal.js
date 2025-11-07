import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaCalendarAlt, FaClock, FaUser, FaCheckCircle, FaExclamationTriangle, FaDownload, FaUpload, FaSave, FaFileAlt, FaClipboardList, FaCheckDouble, FaListAlt, FaUsers, FaCheck } from 'react-icons/fa';
import { API_BASE_URL } from '../config/api';

// Helper function to get profile image URL
const getProfileImageUrl = (member) => {
  if (!member?.profile_image_url) return null;
  return member.profile_image_url;
};

const EvaluationModal = ({ isOpen, onClose, evaluation, project, phase, groupData, currentUser }) => {
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
  
  // Auto-save debounce timer
  const autoSaveTimer = useRef(null);

  useEffect(() => {
    if (isOpen && evaluation) {
      setIsModalLoading(true);
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
      // Only load existing evaluation if it has a valid submission ID (not a phase card ID)
      if (evaluation.id && !evaluation.id.startsWith('phase-eval-')) {
        loadExistingEvaluation();
      }
      // If it's a phase evaluation without criteria yet, load the evaluation form
      if (evaluation.type === 'phase_evaluation' && !evaluation.evaluation_criteria) {
        loadPhaseEvaluationForm();
      }
      setTimeout(() => setIsModalLoading(false), 300);
    }
  }, [isOpen, evaluation, groupData, currentUser]);

  // Load phase evaluation form details from backend
  const loadPhaseEvaluationForm = async () => {
    try {
      if (!phase?.id) return;

      const token = localStorage.getItem('token');
      
      // Fetch the phase evaluation form for this phase
      const response = await fetch(`/api/phases/${phase.id}/evaluation-form`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Phase evaluation form loaded:', data);
        setPhaseEvaluationForm(data.form);
        setPhaseEvaluationCriteria(data.criteria || []);
      } else {
        console.warn('Failed to load phase evaluation form');
      }
    } catch (error) {
      console.error('Error loading phase evaluation form:', error);
    }
  };

  // Auto-save when evaluation data changes (for built-in evaluations)
  useEffect(() => {
    if (!isOpen || !evaluation || evaluation.is_custom_evaluation || evaluation.id?.startsWith('phase-eval-')) return;

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
    // Skip auto-save for phase evaluations (ID starts with 'phase-eval-')
    if (!evaluation.id || evaluation.is_custom_evaluation || evaluation.id.startsWith('phase-eval-')) {
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
    const status = evaluation?.status || 'pending';
    switch (status) {
      case 'active':
        return '#34656D'; // Teal
      case 'pending':
        return '#f59e0b'; // Orange
      case 'due':
        return '#f59e0b'; // Orange
      case 'submitted':
        return '#10b981'; // Green
      case 'completed':
        return '#10b981'; // Green
      case 'late':
        return '#d97706'; // Dark Orange
      default:
        return '#6b7280'; // Gray
    }
  };

  const getLoadingColor = () => {
    if (!evaluation) return '#34656D';
    return getHeaderColor(evaluation);
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
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
    return currentPage !== 'submission';
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
    if (evaluation.file_url) {
      try {
        const link = document.createElement('a');
        link.href = evaluation.file_url;
        link.download = evaluation.file_name || 'evaluation-form.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Failed to download PDF');
      }
    }
  };

  // Handle PDF upload for custom evaluations
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        const base64 = event.target?.result;
        
        // Submit to backend - aggregated model for custom evaluations
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/evaluations/submission/${evaluation.id}/submit`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            file_submission_url: base64,
            file_name: file.name,
            status: 'submitted'
          })
        });

        if (response.ok) {
          alert('Evaluation submitted successfully!');
          onClose();
        } else {
          const error = await response.json();
          alert(`Failed to upload evaluation: ${error.message}`);
        }
        setUploading(false);
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload evaluation');
      setUploading(false);
    }
  };

  // Submit entire aggregated evaluation (all members at once)
  const handleSubmitAggregatedEvaluation = async () => {
    try {
      // Validate that at least one member has been scored
      const hasScores = Object.values(evaluationData.evaluated_members || {})
        .some(member => member.total > 0);

      if (!hasScores) {
        alert('Please provide at least one evaluation score before submitting');
        return;
      }

      setUploading(true);
      const token = localStorage.getItem('token');
      
      // Mark all members as completed
      const completedEvalData = {
        ...evaluationData,
        progress: Object.keys(evaluationData.progress || {}).reduce((acc, memberId) => ({
          ...acc,
          [memberId]: evaluationData.evaluated_members[memberId].total > 0 ? 'submitted' : evaluationData.progress[memberId]
        }), {})
      };

      const response = await fetch(`${API_BASE_URL}/api/evaluations/submission/${evaluation.id}/submit`, {
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
        alert('Evaluation submitted successfully for all members!');
        onClose();
      } else {
        const error = await response.json();
        alert(`Failed to submit evaluation: ${error.message}`);
      }
      setUploading(false);
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
  const renderPhaseDetailsPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' }}>Phase Details</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem'
        }}>
          <div>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Phase</label>
            <p style={{ margin: 0, fontSize: '1rem', color: '#1f2937', fontWeight: '600' }}>
              Phase {phase?.phase_number || evalData.phase_number}: {phase?.title || evalData.phase_title}
            </p>
          </div>
          
          <div>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>File Type</label>
            <p style={{ margin: 0, fontSize: '1rem', color: '#1f2937', fontWeight: '600' }}>
              Built-in Evaluation Form
            </p>
          </div>
          
          <div>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Total Points</label>
            <p style={{ margin: 0, fontSize: '1rem', color: '#1f2937', fontWeight: '600' }}>
              {evalData.total_points || 100} points
            </p>
          </div>
          
          <div>
            <label style={{ fontSize: '0.85rem', color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '0.5rem' }}>Due Date</label>
            <p style={{ margin: 0, fontSize: '1rem', color: '#1f2937', fontWeight: '600' }}>
              {formatDateTime(evalData.due_date)}
            </p>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#f0f9ff',
        border: '1px solid #bfdbfe',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h4 style={{ margin: '0 0 0.75rem 0', color: '#1f2937', fontSize: '1rem', fontWeight: '600' }}>Instructions</h4>
        <p style={{ margin: 0, color: '#6b7280', lineHeight: '1.6' }}>
          {phaseEvaluationForm?.instructions || evalData.description || 'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.'}
        </p>
      </div>

      <div style={{
        backgroundColor: '#fef3c7',
        border: '1px solid #fcd34d',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h4 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontSize: '1rem', fontWeight: '600' }}>📌 Next Step</h4>
        <p style={{ margin: 0, color: '#78350f', lineHeight: '1.6' }}>
          Click "Next" to start evaluating team members. You'll evaluate each member separately using the rubric criteria.
        </p>
      </div>
    </div>
  );

  // Page 2+: Member Evaluation
  const renderMemberPage = () => {
    if (!groupMembers.length) return null;
    
    const currentMember = groupMembers[currentMemberIndex];
    if (!currentMember) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Evaluation Criteria (compact grid, 2 per row) */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.75rem'
        }}>
          {phaseEvaluationCriteria && Array.isArray(phaseEvaluationCriteria) && phaseEvaluationCriteria.length > 0 ? (
            phaseEvaluationCriteria.map((criterion) => {
              const currentValue = evaluationData.evaluated_members[currentMember.id]?.criteria[criterion.id] || 0;
              return (
                <div key={criterion.id} style={{
                  backgroundColor: '#f9fafb',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: '#1f2937', fontSize: '0.95rem', display: 'block', marginBottom: '0.1rem' }}>
                        {criterion.name}
                      </strong>
                      <p style={{ color: '#6b7280', fontSize: '0.75rem', margin: 0, lineHeight: '1.2' }}>
                        {criterion.description}
                      </p>
                    </div>
                    <span style={{
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      padding: '0.15rem 0.5rem',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>
                      {criterion.max_points}pt
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <input
                      type="number"
                      min="0"
                      max={criterion.max_points}
                      value={currentValue}
                      onChange={(e) => handleScoreChange(currentMember.id, criterion.id, e.target.value, criterion.max_points)}
                      onBlur={(e) => {
                        // Ensure value is properly formatted when user leaves field
                        let val = parseInt(e.target.value) || 0;
                        if (val > criterion.max_points) {
                          val = criterion.max_points;
                        }
                        if (val < 0) {
                          val = 0;
                        }
                        handleScoreChange(currentMember.id, criterion.id, val.toString(), criterion.max_points);
                      }}
                      style={{
                        width: '72px',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        fontSize: '0.95rem'
                      }}
                    />

                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                      <span style={{ fontWeight: 600, color: '#3b82f6' }}>{currentValue}</span> / {criterion.max_points}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p style={{ color: '#9ca3af', textAlign: 'center', fontSize: '0.9rem' }}>No criteria defined for this evaluation.</p>
          )}
        </div>

        {/* Member Total Score */}
        {phaseEvaluationCriteria && Array.isArray(phaseEvaluationCriteria) && (
          <div style={{
            backgroundColor: '#f0f9ff',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <strong style={{ color: '#1f2937', fontSize: '0.9rem' }}>Total:</strong>
            <div style={{
              fontSize: '1.25rem',
              fontWeight: 'bold',
              color: '#3b82f6'
            }}>
              {evaluationData.evaluated_members[currentMember.id]?.total || 0} / {phaseEvaluationForm?.total_points || phaseEvaluationCriteria.reduce((sum, c) => sum + c.max_points, 0)}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Page 3: Submission/Summary
  const renderSubmissionPage = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{
        backgroundColor: '#f3fafb',
        border: '1px solid #c1e4e8',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937', fontSize: '1.1rem', fontWeight: '600' }}>Submission Summary</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '1.5rem'
        }}>
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>Members Evaluated</p>
            <p style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937', fontWeight: '700' }}>
              {Object.values(evaluationData.evaluated_members).filter(m => m.total > 0).length} / {Object.keys(evaluationData.evaluated_members).length}
            </p>
          </div>
          
          <div>
            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#6b7280', fontWeight: '500' }}>Total Points Assigned</p>
            <p style={{ margin: 0, fontSize: '1.25rem', color: '#1f2937', fontWeight: '700' }}>
              {evaluationData.aggregate_total} points
            </p>
          </div>
        </div>
      </div>

      {/* Member Summary Table */}
      {groupMembers.length > 0 && (
        <div style={{
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem'
          }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f3f4f6' }}>
                <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#1f2937' }}>Member</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#1f2937' }}>Score</th>
                <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600', color: '#1f2937' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {groupMembers.map((member, idx) => {
                const memberScore = evaluationData.evaluated_members[member.id]?.total || 0;
                const isCompleted = memberScore > 0;
                return (
                  <tr key={member.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', color: '#1f2937' }}>
                      {member.first_name} {member.last_name}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center', color: '#3b82f6', fontWeight: '600' }}>
                      {memberScore} / {evalData.total_points || 100}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      <span style={{
                        backgroundColor: isCompleted ? '#d1fae5' : '#fee2e2',
                        color: isCompleted ? '#065f46' : '#991b1b',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {isCompleted ? '✓ Scored' : '⊘ Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div style={{
        backgroundColor: '#fef3c7',
        border: '1px solid #fcd34d',
        borderRadius: '12px',
        padding: '1.5rem'
      }}>
        <h4 style={{ margin: '0 0 0.75rem 0', color: '#92400e', fontSize: '1rem', fontWeight: '600' }}>📝 Ready to Submit?</h4>
        <p style={{ margin: 0, color: '#78350f', lineHeight: '1.6' }}>
          Review your evaluations above. Once submitted, your evaluation scores cannot be changed. Make sure all team members have been evaluated fairly.
        </p>
      </div>
    </div>
  );

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
        <div className="task-detail-modal-header" style={{ backgroundColor: getHeaderColor(evaluation), flex: '0 0 auto' }}>
          <div className="task-detail-modal-header-left">
            {/* Header left content */}
          </div>
          <div className="task-detail-modal-header-right">
            <button className="task-detail-modal-close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
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
                const memberScore = evaluationData.evaluated_members[member.id]?.total || 0;
                const isCompleted = memberScore > 0;
                // Use same naming logic as "My Group" sidebar
                const memberName = member.full_name || member.user_name || member.name || 'Unknown';
                const memberPosition = member.position || member.role || member.title || 'Team Member';
                
                return (
                  <button
                    key={member.id}
                    onClick={() => {
                      setCurrentPage(`member-${idx}`);
                      setCurrentMemberIndex(idx);
                    }}
                    style={{
                      backgroundColor: currentPage === `member-${idx}` ? '#f0f0f0' : 'white',
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
                      margin: 0
                    }}
                    onMouseEnter={(e) => {
                      if (currentPage !== `member-${idx}`) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentPage !== `member-${idx}`) {
                        e.currentTarget.style.backgroundColor = 'white';
                      }
                    }}
                    title={`Evaluating Member: ${memberName} - ${memberPosition}`}
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
              <button
                onClick={() => {
                  setCurrentPage('submission');
                }}
                style={{
                  backgroundColor: currentPage === 'submission' ? '#f0f0f0' : 'white',
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
                  margin: 0
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 'submission') {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 'submission') {
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <FaCheckCircle style={{ fontSize: '1rem', flexShrink: 0, color: '#666' }} />
                <span>Review & Submit</span>
              </button>
            </div>

            {/* Right Column - Content Area */}
            <div style={{
              padding: '2rem',
              overflowY: 'auto',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ marginBottom: '2rem' }}>
                {currentPage.startsWith('member-') ? (
                  // Member Evaluation Header with Profile Info
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
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
                      backgroundImage: getProfileImageUrl(groupMembers[currentMemberIndex]) ? `url(${getProfileImageUrl(groupMembers[currentMemberIndex])})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }}>
                      {!getProfileImageUrl(groupMembers[currentMemberIndex]) && (groupMembers[currentMemberIndex]?.first_name?.[0] || 'M').toUpperCase()}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                        {groupMembers[currentMemberIndex]?.first_name} {groupMembers[currentMemberIndex]?.last_name}
                      </h2>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: '#6b7280', fontWeight: '500' }}>
                        {groupMembers[currentMemberIndex]?.position || groupMembers[currentMemberIndex]?.role || groupMembers[currentMemberIndex]?.title || 'Team Member'}
                      </p>
                    </div>
                  </div>
                ) : (
                  // Default title for other pages
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700', color: '#1f2937' }}>
                    {getPageTitle()}
                  </h2>
                )}
              </div>

              {renderCurrentPage()}
            </div>
          </div>
        ) : (
          // Custom Evaluation - Original Layout
          <div className="task-detail-modal-content">
            {/* Left Column - Evaluation Details */}
            <div className="task-detail-modal-left-column">
            {/* Evaluation Title */}
            <div className="task-detail-modal-title-section">
              <h2 className="task-detail-modal-title">
                {evalData.title || evalData.project_title || 'Evaluation'}
              </h2>
            </div>

            {/* Information Pills */}
            <div className="task-detail-modal-pills">
              <div className="task-detail-modal-pill">
                <FaCalendarAlt className="task-detail-modal-pill-icon" />
                <span className="task-detail-modal-pill-label">Due:</span>
                <span className="task-detail-modal-pill-value">
                  {formatDateTime(evalData.due_date)}
                </span>
              </div>
              <div className="task-detail-modal-pill">
                <FaUser className="task-detail-modal-pill-icon" />
                <span className="task-detail-modal-pill-label">Type:</span>
                <span className="task-detail-modal-pill-value">
                  {isCustomEvaluation ? 'PDF Form' : 'Peer Evaluation'}
                </span>
              </div>
              <div className="task-detail-modal-pill">
                <FaClock className="task-detail-modal-pill-icon" />
                <span className="task-detail-modal-pill-label">Status:</span>
                <span className="task-detail-modal-pill-value">
                  {evalData.status === 'active' ? 'Active' : evalData.status?.toUpperCase()}
                </span>
              </div>
              {/* Late Indicator Pill */}
              {isEvaluationLate(evalData) && (
                <div className="task-detail-modal-pill" style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626'
                }}>
                  <FaExclamationTriangle className="task-detail-modal-pill-icon" />
                  <span className="task-detail-modal-pill-label">Status:</span>
                  <span className="task-detail-modal-pill-value" style={{ fontWeight: 'bold' }}>Late</span>
                </div>
              )}

              {/* Auto-save Status */}
              {isBuiltInEvaluation && saveStatus !== 'idle' && (
                <div className="task-detail-modal-pill" style={{
                  backgroundColor: saveStatus === 'saved' ? '#f0fdf4' : saveStatus === 'error' ? '#fef2f2' : '#eff6ff',
                  border: saveStatus === 'saved' ? '1px solid #bbf7d0' : saveStatus === 'error' ? '1px solid #fecaca' : '1px solid #bfdbfe',
                  color: saveStatus === 'saved' ? '#059669' : saveStatus === 'error' ? '#dc2626' : '#1e40af'
                }}>
                  <FaSave className="task-detail-modal-pill-icon" />
                  <span className="task-detail-modal-pill-value" style={{ fontWeight: 'bold' }}>
                    {saveStatus === 'saving' && 'Saving...'}
                    {saveStatus === 'saved' && '✓ Saved'}
                    {saveStatus === 'error' && '✗ Error'}
                  </span>
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="task-detail-modal-description-section">
              <div className="task-detail-modal-section-header">
                <div className="task-detail-modal-section-icon">📋</div>
                <h3>Evaluation Details</h3>
              </div>
              <div className="task-detail-modal-description-content">
                <p>
                  {evalData.description || 
                   'Complete your evaluation to provide feedback on this project or assignment.'}
                </p>
              </div>
            </div>

            {/* Custom Evaluation - PDF Download/Upload */}
            {isCustomEvaluation && (
              <div className="task-detail-modal-description-section">
                <div className="task-detail-modal-section-header">
                  <div className="task-detail-modal-section-icon">📄</div>
                  <h3>Evaluation Form</h3>
                </div>
                <div style={{
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
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
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = '#2563eb';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = '#3b82f6';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <FaDownload /> Download Evaluation Form
                  </button>

                  <div style={{
                    backgroundColor: 'white',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    padding: '2rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.backgroundColor = '#f0f9ff';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = '#d1d5db';
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      handleFileUpload({ target: { files: [file] } });
                    }
                  }}
                  onClick={() => document.getElementById('file-input-custom')?.click()}
                  >
                    <FaUpload style={{ fontSize: '2rem', color: '#9ca3af', marginBottom: '0.5rem' }} />
                    <p style={{ margin: '0.5rem 0', color: '#6b7280' }}>
                      Drop your completed form here or click to browse
                    </p>
                    <p style={{ margin: '0', fontSize: '0.85rem', color: '#9ca3af' }}>
                      Supports PDF, DOC, DOCX files
                    </p>
                    <input
                      id="file-input-custom"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                  </div>

                  <button
                    onClick={() => {
                      const input = document.getElementById('file-input-custom');
                      if (input) input.click();
                    }}
                    disabled={uploading}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      backgroundColor: uploading ? '#d1d5db' : '#10b981',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      cursor: uploading ? 'not-allowed' : 'pointer',
                      fontSize: '0.95rem',
                      fontWeight: '600',
                      transition: 'all 0.2s ease',
                      opacity: uploading ? 0.6 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!uploading) {
                        e.target.style.backgroundColor = '#059669';
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!uploading) {
                        e.target.style.backgroundColor = '#10b981';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }
                    }}
                  >
                    <FaUpload /> {uploading ? 'Uploading...' : 'Upload Completed Form'}
                  </button>
                </div>
              </div>
            )}

            {/* Built-In Evaluation - Criteria Form */}
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

          {/* Right Column - Member Selection or Status */}
          <div className="task-detail-modal-right-column">
            {isBuiltInEvaluation && groupMembers.length > 0 ? (
              <>
                {/* Member Selection Section */}
                <div className="task-detail-modal-file-upload-section">
                  <div className="task-detail-modal-section-header">
                    <h3>Select Team Member</h3>
                  </div>
                  <div className="task-detail-modal-file-upload-area">
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem'
                    }}>
                      {groupMembers.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => setSelectedMember(member.id)}
                          style={{
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            backgroundColor: selectedMember === member.id ? '#dbeafe' : '#f3f4f6',
                            border: selectedMember === member.id ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = selectedMember === member.id ? '#dbeafe' : '#e5e7eb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = selectedMember === member.id ? '#dbeafe' : '#f3f4f6';
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: '#6b7280'
                          }}>
                            {(member.first_name?.[0] || 'M').toUpperCase()}
                          </div>
                          <div>
                            <div style={{
                              fontWeight: '600',
                              color: '#1f2937',
                              fontSize: '0.9rem'
                            }}>
                              {member.first_name} {member.last_name}
                            </div>
                            <div style={{
                              fontSize: '0.8rem',
                              color: '#9ca3af'
                            }}>
                              {member.email}
                            </div>
                          </div>
                          {selectedMember === member.id && (
                            <FaCheckCircle style={{
                              marginLeft: 'auto',
                              color: '#3b82f6',
                              fontSize: '1.1rem'
                            }} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Member Scores Section */}
                {selectedMember && (
                  <div className="task-detail-modal-file-upload-section">
                    <div className="task-detail-modal-section-header">
                      <h3>Score {groupMembers.find(m => m.id === selectedMember)?.first_name}</h3>
                    </div>
                    <div className="task-detail-modal-file-upload-area">
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '1rem'
                      }}>
                        {evalData.criteria && Array.isArray(evalData.criteria) && evalData.criteria.map((criterion) => (
                          <div key={criterion.id} style={{
                            backgroundColor: '#f9fafb',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }}>
                            <div style={{
                              marginBottom: '0.5rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start'
                            }}>
                              <div>
                                <strong style={{ color: '#1f2937' }}>{criterion.name}</strong>
                                <p style={{ color: '#6b7280', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                                  {criterion.description}
                                </p>
                              </div>
                              <span style={{
                                backgroundColor: '#dbeafe',
                                color: '#1e40af',
                                padding: '0.25rem 0.75rem',
                                borderRadius: '12px',
                                fontSize: '0.8rem',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                                marginLeft: '0.5rem'
                              }}>
                                Max: {criterion.max_points}
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max={criterion.max_points}
                              value={evaluationData.evaluated_members[selectedMember]?.criteria[criterion.id] || 0}
                              onChange={(e) => handleScoreChange(selectedMember, criterion.id, e.target.value, criterion.max_points)}
                              style={{
                                width: '100%',
                                cursor: 'pointer'
                              }}
                            />
                            <div style={{
                              marginTop: '0.5rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              fontSize: '0.85rem',
                              color: '#6b7280'
                            }}>
                              <span>0</span>
                              <span style={{
                                fontWeight: '600',
                                color: '#3b82f6'
                              }}>
                                {evaluationData.evaluated_members[selectedMember]?.criteria[criterion.id] || 0} / {criterion.max_points}
                              </span>
                              <span>{criterion.max_points}</span>
                            </div>
                          </div>
                        ))}

                        {/* Member Total Score */}
                        {evalData.criteria && Array.isArray(evalData.criteria) && (
                          <div style={{
                            backgroundColor: '#f0f9ff',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '2px solid #bfdbfe'
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}>
                              <strong style={{ color: '#1f2937' }}>Total for {groupMembers.find(m => m.id === selectedMember)?.first_name}:</strong>
                              <div style={{
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                color: '#3b82f6'
                              }}>
                                {evaluationData.evaluated_members[selectedMember]?.total || 0} / {evalData.total_points || evalData.criteria.reduce((sum, c) => sum + c.max_points, 0)}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Overall Summary */}
                        <div style={{
                          backgroundColor: '#f3fafb',
                          padding: '1rem',
                          borderRadius: '8px',
                          border: '1px solid #c1e4e8'
                        }}>
                          <strong style={{ color: '#1f2937', display: 'block', marginBottom: '0.5rem' }}>Overall Summary</strong>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '0.75rem',
                            fontSize: '0.9rem'
                          }}>
                            <div>
                              <span style={{ color: '#6b7280' }}>Members Scored:</span>
                              <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                {Object.values(evaluationData.evaluated_members).filter(m => m.total > 0).length} / {Object.keys(evaluationData.evaluated_members).length}
                              </div>
                            </div>
                            <div>
                              <span style={{ color: '#6b7280' }}>Aggregate Total:</span>
                              <div style={{ fontWeight: '600', color: '#1f2937' }}>
                                {evaluationData.aggregate_total} pts
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmitAggregatedEvaluation}
                  disabled={uploading}
                  style={{
                    width: '100%',
                    backgroundColor: uploading ? '#d1d5db' : '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontSize: '0.95rem',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    opacity: uploading ? 0.6 : 1,
                    marginTop: '1rem'
                  }}
                  onMouseEnter={(e) => {
                    if (!uploading) {
                      e.target.style.backgroundColor = '#059669';
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!uploading) {
                      e.target.style.backgroundColor = '#10b981';
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  {uploading ? 'Submitting...' : 'Submit All Evaluations'}
                </button>
              </>
            ) : (
              /* Status Section for Custom Evaluations or when no members */
              <div className="task-detail-modal-file-upload-section">
                <div className="task-detail-modal-section-header">
                  <h3>Evaluation Status</h3>
                </div>
                <div className="task-detail-modal-file-upload-area">
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1.5rem'
                  }}>
                    {/* Status Badge */}
                    <div>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        marginBottom: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Current Status
                      </div>
                      <div style={{
                        backgroundColor: getHeaderColor(evalData),
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '20px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        display: 'inline-block',
                        textTransform: 'capitalize'
                      }}>
                        {evalData.status === 'active' ? 'Active' :
                         evalData.status === 'pending' ? 'Pending' :
                         evalData.status === 'submitted' ? 'Submitted' :
                         evalData.status === 'completed' ? 'Completed' :
                         evalData.status === 'late' ? 'Late' :
                         evalData.status || 'Unknown'}
                      </div>
                    </div>

                    {/* Timeline Card */}
                    <div style={{
                      backgroundColor: '#f9fafb',
                      padding: '1rem',
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#6b7280',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaClock /> Timeline
                      </div>
                      <div style={{
                        fontSize: '0.9rem',
                        color: '#555',
                        lineHeight: '1.8'
                      }}>
                        <div style={{
                          marginBottom: '0.75rem',
                          paddingBottom: '0.75rem',
                          borderBottom: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            fontSize: '0.8rem',
                            color: '#9ca3af',
                            marginBottom: '0.25rem'
                          }}>
                            Due Date
                          </div>
                          <div style={{
                            fontSize: '0.95rem',
                            fontWeight: '500',
                            color: '#1f2937'
                          }}>
                            {formatDateTime(evalData.due_date)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
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
                disabled={uploading}
                style={{
                  padding: '0.75rem 2rem',
                  backgroundColor: uploading ? '#d1d5db' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
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
