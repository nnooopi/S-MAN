import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaClock, FaCalendarAlt, FaRedo, FaCheckCircle, FaExclamationTriangle, FaFileAlt, FaHourglassHalf } from 'react-icons/fa';

const TaskDetailModal = ({ isOpen, onClose, task, project, phase, source = 'todo', onTaskSubmitted, onRequestExtension }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attemptInfo, setAttemptInfo] = useState(null);
  const [previousAttemptFiles, setPreviousAttemptFiles] = useState(null);
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [isNewAttemptMode, setIsNewAttemptMode] = useState(false);
  const fileInputRef = useRef(null);

  // Helper to check if task is missed
  const isTaskMissed = () => {
    if (!task) return false;
    const now = new Date();
    // Use available_until if set, otherwise use due_date
    const deadline = task.available_until ? new Date(task.available_until) : new Date(task.due_date);
    const hasNoSubmissions = !previousAttemptFiles || !previousAttemptFiles.attempts || previousAttemptFiles.attempts.length === 0;
    return now > deadline && hasNoSubmissions && task.status !== 'extension_requested';
  };

  // Helper to check if task has extension requested
  const hasExtensionRequested = () => {
    return task?.status === 'extension_requested';
  };

  // Debug: Log task data structure
  useEffect(() => {
    if (task) {
      console.log('🔍 TaskDetailModal - Task data structure:', task);
      console.log('🔍 TaskDetailModal - studentaccounts:', task.studentaccounts);
      console.log('🔍 TaskDetailModal - assigned_by:', task.assigned_by);
      console.log('🔍 TaskDetailModal - task status:', task.status);
      console.log('🔍 TaskDetailModal - task max_attempts:', task.max_attempts);
      console.log('🔍 TaskDetailModal - task current_attempts:', task.current_attempts);
    }
  }, [task]);

  useEffect(() => {
    if (isOpen && task) {
      setIsModalLoading(true);
      // Load task comments/activity when modal opens
      Promise.all([
        loadTaskComments(),
        loadAttemptInfo(),
        loadPreviousAttemptFiles()
      ]).finally(() => {
        setIsModalLoading(false);
      });
      setSelectedFiles([]); // Clear files when modal opens
      setFileError('');
      setIsNewAttemptMode(false); // Reset to view mode
    }
  }, [isOpen, task]);

  // Set selected attempt when previous attempt files load
  useEffect(() => {
    if (previousAttemptFiles && previousAttemptFiles.attempts && previousAttemptFiles.attempts.length > 0) {
      // Set to the latest attempt by default
      const latestAttempt = previousAttemptFiles.attempts[previousAttemptFiles.attempts.length - 1];
      setSelectedAttempt(latestAttempt);
      setIsNewAttemptMode(false); // Show submitted files
    } else {
      setSelectedAttempt(null);
      setIsNewAttemptMode(true); // Show file upload when no attempts exist
    }
  }, [previousAttemptFiles]);

  // Load feedback when selected attempt changes
  useEffect(() => {
    if (selectedAttempt) {
      loadTaskComments();
    }
  }, [selectedAttempt]);

  const loadAttemptInfo = async () => {
    if (!task) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/attempts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const attemptData = await response.json();
        console.log('📊 Attempt info loaded:', attemptData);
        setAttemptInfo(attemptData);
      } else {
        console.error('Failed to load attempt info:', response.status);
      }
    } catch (error) {
      console.error('Error loading attempt info:', error);
    }
  };

  const loadPreviousAttemptFiles = async () => {
    if (!task) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const filesData = await response.json();
        console.log('📁 Previous attempt files loaded:', filesData);
        console.log('📁 Files data structure:', JSON.stringify(filesData, null, 2));
        setPreviousAttemptFiles(filesData);
      } else {
        console.error('Failed to load previous attempt files:', response.status);
      }
    } catch (error) {
      console.error('Error loading previous attempt files:', error);
    }
  };

  const loadTaskComments = async () => {
    if (!task || !selectedAttempt) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/attempts/${selectedAttempt.attempt_number}/feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Transform feedback data to match comment format
        const transformedComments = data.feedback.map(feedback => ({
          id: feedback.id,
          user: `${feedback.studentaccounts.first_name} ${feedback.studentaccounts.last_name}`,
          action: '', // Remove "provided feedback" text
          content: feedback.feedback_text,
          timestamp: new Date(feedback.created_at).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          }),
          avatar: feedback.studentaccounts.first_name.charAt(0).toUpperCase(),
          profile_image_url: feedback.studentaccounts.profile_image_url,
          rating: feedback.rating,
          is_from_leader: feedback.is_from_leader
        }));
        setComments(transformedComments);
      } else {
        console.error('Failed to load feedback:', response.statusText);
        setComments([]);
      }
    } catch (error) {
      console.error('Error loading task feedback:', error);
      setComments([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getAllowedFileTypes = () => {
    if (!task?.file_types_allowed) return [];
    
    try {
      if (typeof task.file_types_allowed === 'string') {
        // Try to parse as JSON first
        try {
          const parsed = JSON.parse(task.file_types_allowed);
          if (Array.isArray(parsed)) {
            return parsed.map(type => type.toLowerCase());
          }
        } catch {
          // If JSON parsing fails, treat as comma-separated string
          return task.file_types_allowed.split(',').map(type => type.trim().toLowerCase());
        }
      }
      
      if (Array.isArray(task.file_types_allowed)) {
        return task.file_types_allowed.map(type => type.toLowerCase());
      }
    } catch {
      return [];
    }
    return [];
  };

  const getFileExtension = (filename) => {
    return filename.split('.').pop().toLowerCase();
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    const allowedTypes = getAllowedFileTypes();
    
    if (allowedTypes.length === 0) {
      // No restrictions, allow all files
      const newFiles = files.map(file => ({
        name: file.name,
        size: file.size,
        file: file
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setFileError('');
      return;
    }

    const validFiles = [];
    const invalidFiles = [];

    files.forEach(file => {
      const extension = getFileExtension(file.name);
      if (allowedTypes.includes(extension)) {
        validFiles.push({
          name: file.name,
          size: file.size,
          file: file
        });
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }

    if (invalidFiles.length > 0) {
      const allowedTypesText = allowedTypes.map(type => type.toUpperCase()).join(', ');
      setFileError(`Invalid file types selected. Only ${allowedTypesText} files are allowed.`);
      setTimeout(() => setFileError(''), 5000); // Clear error after 5 seconds
    } else {
      setFileError('');
    }

    // Clear the input so the same file can be selected again
    event.target.value = '';
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setFileError('');
  };

  const handleSubmitFiles = async () => {
    if (selectedFiles.length === 0) {
      setFileError('Please select at least one file to submit');
      return;
    }

        // Check if task is in a submittable state - be more permissive
        // Only block submissions if task is explicitly completed or approved
        const blockedStatuses = ['completed', 'approved'];
        if (task.status && blockedStatuses.includes(task.status)) {
          setFileError(`Task cannot be submitted. Current status: ${task.status}. This task is already completed or approved.`);
          return;
        }

        // Check attempt limits using attempt info if available
        if (attemptInfo && !attemptInfo.can_submit) {
          setFileError(`Maximum attempts (${attemptInfo.max_attempts}) exceeded. You have already submitted ${attemptInfo.actual_submissions} times.`);
          return;
        }

    try {
      setIsSubmitting(true);
      setFileError('');
      const token = localStorage.getItem('token');
      
      const formData = new FormData();
      formData.append('task_id', task.id);
      formData.append('submission_text', ''); // Empty text for now
      
      // Add files to FormData
      selectedFiles.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });

      console.log('📤 Submitting task:', task.id, 'with', selectedFiles.length, 'files');
      console.log('📤 Task status:', task.status);

      const response = await fetch('/api/tasks/submit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

          if (response.ok) {
            console.log('✅ Task submitted successfully:', data);
            console.log('🔍 Response data structure:', JSON.stringify(data, null, 2));
            
            // Handle different submission types
            let attemptNumber = 'Unknown';
            if (data.type === 'revision') {
              attemptNumber = `Revision ${data.submission?.revision_attempt_number || 'Unknown'}`;
            } else if (data.type === 'original') {
              attemptNumber = data.attempt_number || data.submission?.attempt_number || 'Unknown';
            }
            
            alert(`Task submitted successfully! (${attemptNumber})`);
            
            // Clear selected files
            setSelectedFiles([]);
            
            // Reload attempt info to get updated counts
            loadAttemptInfo();
            
            // Reload previous attempt files to show the new submission
            loadPreviousAttemptFiles();
            
            // Close modal
            onClose();
            
            // Call the callback to refresh parent component data
            if (onTaskSubmitted) {
              onTaskSubmitted();
            }
          } else {
        console.error('❌ Submission failed:', data);
        setFileError(data.error || 'Failed to submit task');
      }
    } catch (error) {
      console.error('❌ Submission error:', error);
      setFileError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPhaseTitle = (task, phase) => {
    // Try multiple sources for phase title
    if (phase?.title) return phase.title;
    if (phase?.phase_title) return phase.phase_title;
    if (phase?.name) return phase.name;
    if (task?.project_phases?.title) return task.project_phases.title;
    if (task?.phase_info?.title) return task.phase_info.title;
    if (task?.phase_name) return task.phase_name;
    if (task?.phase_info?.phase_title) return task.phase_info.phase_title;
    return 'Unknown Phase';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getLoadingColor = () => {
    switch (source) {
      case 'pending':
        return '#f59e0b'; // Orange for pending
      case 'revision':
        return '#dc2626'; // Red for revision
      case 'completed':
        return '#10b981'; // Green for completed
      case 'todo':
      default:
        return '#34656D'; // Teal for to-do
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedAttempt) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/attempts/${selectedAttempt.attempt_number}/feedback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          feedback_text: newComment.trim()
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Feedback submitted successfully');
        
        // Reload feedback to show the new comment
        await loadTaskComments();
    setNewComment('');
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to submit feedback:', errorData.error);
        alert('Failed to submit feedback: ' + errorData.error);
      }
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      alert('Error submitting feedback. Please try again.');
    }
  };

  const formatFileTypes = (fileTypes) => {
    if (!fileTypes || (Array.isArray(fileTypes) && fileTypes.length === 0)) {
      return 'Any File Types';
    }
    
    // Handle different formats
    if (typeof fileTypes === 'string') {
      try {
        // Try to parse as JSON array
        const parsed = JSON.parse(fileTypes);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return 'Any File Types';
          return parsed.map(type => type.toUpperCase()).join(', ');
        }
      } catch {
        // If not JSON, return as is
        return fileTypes;
      }
    }
    
    if (Array.isArray(fileTypes)) {
      if (fileTypes.length === 0) return 'Any File Types';
      return fileTypes.map(type => type.toUpperCase()).join(', ');
    }
    
    return fileTypes;
  };

  const getHeaderColor = (task) => {
    if (!task) return '#34656D'; // Default color
    
    const now = new Date();
    const dueDate = new Date(task.due_date);
    const availableUntil = task.available_until ? new Date(task.available_until) : null;
    
    // Check if task is missed (past available_until date and no submissions)
    if (availableUntil && now > availableUntil && !task.task_submissions?.length && !task.revision_submissions?.length) {
      return '#ef4444'; // Red for missed
    }
    
    // Check if there are pending revision submissions
    const hasPendingRevision = task.revision_submissions?.some(rev => rev.status === 'pending');
    if (hasPendingRevision) {
      return '#f59e0b'; // Orange for pending
    }
    
    // Check if latest revision was approved
    const latestRevision = task.revision_submissions?.[0];
    if (latestRevision && latestRevision.status === 'approved') {
      return '#10b981'; // Green for completed
    }
    
    // If task status is 'to_revise' or 'pending_review', handle accordingly
    if (task.status === 'to_revise') {
      return '#f59e0b'; // Orange for revise
    }
    
    if (task.status === 'pending_review' || task.status === 'pending_revision_review') {
      return '#f59e0b'; // Orange for pending
    }
    
    // If no submissions at all, task is active (unless missed)
    if (!task.task_submissions?.length) {
      return '#34656D'; // Teal for active/to-do
    }
    
    const latestSubmission = task.task_submissions[task.task_submissions.length - 1];
    
    switch (latestSubmission.status) {
      case 'pending': 
        return '#f59e0b'; // Orange for pending
      case 'approved': 
        return '#10b981'; // Green for completed
      case 'rejected': 
        return '#ef4444'; // Red for rejected
      case 'revision_requested': 
        return '#f59e0b'; // Orange for revise
      default: 
        return '#34656D'; // Teal for active/to-do
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatFileName = (filename) => {
    if (!filename) return 'Unknown file';
    
    // Remove timestamp prefix (e.g., "1760237682772_")
    const cleanName = filename.replace(/^\d+_/, '');
    
    // Remove any additional timestamp patterns
    const finalName = cleanName.replace(/^\d{13}_/, '');
    
    return finalName;
  };

  const handleAttemptSelect = (attempt) => {
    setSelectedAttempt(attempt);
    setIsNewAttemptMode(false);
  };

  const handleNewAttempt = () => {
    setIsNewAttemptMode(true);
    setSelectedFiles([]);
    setFileError('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#34656D';
      case 'completed': return '#10b981';
      case 'revise': return '#f59e0b';
      case 'pending': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <FaCheckCircle />;
      case 'revise': return <FaExclamationTriangle />;
      default: return <FaFileAlt />;
    }
  };

  // Helper function to check if a task is late
  const isTaskLate = (task) => {
    const now = new Date();
    const dueDate = new Date(task.due_date);
    const availableUntil = task.available_until ? new Date(task.available_until) : null;
    
    // PRIORITY 1: Use database is_late field if available
    if (task.task_submissions?.length > 0) {
      const latestSubmission = task.task_submissions[0]; // Most recent submission
      if (latestSubmission.is_late !== undefined) {
        return latestSubmission.is_late;
      }
    }
    
    // PRIORITY 2: Check revision submissions for late status
    if (task.revision_submissions?.length > 0) {
      const latestRevision = task.revision_submissions[0];
      if (latestRevision.is_late !== undefined) {
        return latestRevision.is_late;
      }
    }
    
    // PRIORITY 3: Fallback to calculation if no database field
    if (!task.task_submissions?.length) {
      return now > dueDate && (!availableUntil || now <= availableUntil);
    }
    
    // Check if any original submission was late
    const wasOriginallySubmittedLate = task.task_submissions?.some(submission => {
      const submissionDate = new Date(submission.submission_date || submission.submitted_at || submission.created_at);
      return submissionDate > dueDate && (!availableUntil || submissionDate <= availableUntil);
    });
    
    return wasOriginallySubmittedLate;
  };

  if (!isOpen || !task) return null;

  return (
    <div className="task-detail-modal-overlay" onClick={onClose}>
      <div className="task-detail-modal-container" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
        {/* Loading Overlay */}
        {isModalLoading && (
          <div className="modal-loading-overlay" style={{
            position: 'absolute',
            top: '80px', // Start below the header
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999, // Much higher than dropdown
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
        <div className="task-detail-modal-header" style={{ backgroundColor: getHeaderColor(task) }}>
          <div className="task-detail-modal-header-left">
            {/* Removed "This Week" section */}
          </div>
          <div className="task-detail-modal-header-right">
            <button className="task-detail-modal-close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="task-detail-modal-content">
          {/* Left Column - Task Details */}
          <div className="task-detail-modal-left-column">
            {/* Task Title */}
            <div className="task-detail-modal-title-section">
              <h2 className="task-detail-modal-title">{task.title || 'Untitled Task'}</h2>
              {previousAttemptFiles && previousAttemptFiles.attempts && previousAttemptFiles.attempts.length > 0 && (
                <div className="task-detail-modal-attempts-dropdown">
                  <select 
                    value={selectedAttempt?.attempt_number || ''} 
                    onChange={(e) => {
                      const attemptNumber = parseInt(e.target.value);
                      const attempt = previousAttemptFiles?.attempts?.find(a => a.attempt_number === attemptNumber);
                      handleAttemptSelect(attempt);
                    }}
                    className="task-detail-modal-attempts-select"
                    disabled={isModalLoading}
                  >
                    {previousAttemptFiles?.attempts?.map((attempt) => (
                      <option key={attempt.attempt_number} value={attempt.attempt_number}>
                        Attempt {attempt.attempt_number}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Extension Request Indicator */}
            {hasExtensionRequested() && (
              <div style={{
                backgroundColor: '#FFF3CD',
                border: '1px solid #FFC107',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <FaClock style={{ color: '#FFC107', fontSize: '20px' }} />
                <div>
                  <div style={{ fontWeight: '600', color: '#856404', marginBottom: '4px' }}>
                    Extension Request Pending
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#856404' }}>
                    Your deadline extension request is awaiting approval from your group leader.
                  </div>
                </div>
              </div>
            )}

            {/* Information Pills */}
            <div className="task-detail-modal-pills">
              <div className="task-detail-modal-pill">
                <FaCalendarAlt className="task-detail-modal-pill-icon" />
                <span className="task-detail-modal-pill-label">Due:</span>
                <span className="task-detail-modal-pill-value">{formatDateTime(task.due_date)}</span>
              </div>
              <div className="task-detail-modal-pill">
                <FaClock className="task-detail-modal-pill-icon" />
                <span className="task-detail-modal-pill-label">Available Until:</span>
                <span className="task-detail-modal-pill-value">{formatDateTime(task.available_until)}</span>
              </div>
              <div className="task-detail-modal-pill">
                <FaRedo className="task-detail-modal-pill-icon" />
                <span className="task-detail-modal-pill-label">Attempts:</span>
                <span className="task-detail-modal-pill-value">
                  {attemptInfo ? 
                    `${attemptInfo.actual_submissions}/${attemptInfo.max_attempts === -1 ? '∞' : attemptInfo.max_attempts || '∞'}` :
                    `${task.current_attempts || 0}/${task.max_attempts === -1 ? '∞' : task.max_attempts || '∞'}`
                  }
                </span>
              </div>
              {/* Late Indicator Pill */}
              {isTaskLate(task) && (
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
            </div>

            {/* Description Section */}
            <div className="task-detail-modal-description-section">
              <div className="task-detail-modal-section-header">
                <div className="task-detail-modal-section-icon">☰</div>
                <h3>Description</h3>
              </div>
              <div className="task-detail-modal-description-content">
                <p>{task.description || 'No description available'}</p>
              </div>
            </div>

            {/* Task Details Grid */}
            <div className="task-detail-modal-details-grid">
              <div className="task-detail-modal-detail-item">
                <label>File Types Allowed:</label>
                <span>{formatFileTypes(task.file_types_allowed)}</span>
              </div>
              <div className="task-detail-modal-detail-item">
                <label>Phase:</label>
                <span>{getPhaseTitle(task, phase)}</span>
              </div>
              <div className="task-detail-modal-detail-item">
                <label>Assigned by:</label>
                <span>{task.studentaccounts?.first_name && task.studentaccounts?.last_name 
                  ? `${task.studentaccounts.first_name} ${task.studentaccounts.last_name}`
                  : task.assigned_by_name || task.leader_name || task.assigned_by || 'Unknown'}</span>
              </div>
              <div className="task-detail-modal-detail-item">
                <label>Assigned at:</label>
                <span>{task.created_at ? formatDateTime(task.created_at) : 'Not specified'}</span>
              </div>
            </div>
          </div>

          {/* Right Column - Comments and Activity */}
          <div className="task-detail-modal-right-column">
            {/* File Upload Section */}
            <div className="task-detail-modal-file-upload-section">
              <div className="task-detail-modal-section-header">
                <h3>{isNewAttemptMode ? 'File Upload' : `Submitted Files for Attempt ${selectedAttempt?.attempt_number || 'Unknown'}`}</h3>
                {!isNewAttemptMode && selectedAttempt && (
                  <p className="task-detail-modal-submission-date">{formatDateTime(selectedAttempt.submission_date)}</p>
                )}
            </div>
              <div className="task-detail-modal-file-upload-area">
                {isNewAttemptMode ? (
                  <div 
                    className="task-detail-modal-file-dropzone"
                    onDragOver={(e) => {
                      if (!isTaskMissed()) {
                        e.preventDefault();
                      }
                    }}
                    onDrop={(e) => {
                      if (!isTaskMissed()) {
                        e.preventDefault();
                        handleFileSelect({ target: { files: e.dataTransfer.files } });
                      }
                    }}
                    onClick={(e) => {
                      // Disable clicking if task is missed
                      if (isTaskMissed()) {
                        return;
                      }
                      // Only trigger file input if clicking on the dropzone itself, not on child elements
                      if (e.target === e.currentTarget || e.target.classList.contains('task-detail-modal-file-dropzone-content')) {
                        if (fileInputRef.current) {
                          fileInputRef.current.click();
                        }
                      }
                    }}
                    style={{
                      opacity: isTaskMissed() ? 0.5 : 1,
                      cursor: isTaskMissed() ? 'not-allowed' : 'pointer',
                      pointerEvents: isTaskMissed() ? 'none' : 'auto'
                    }}
                  >
                    <div className="task-detail-modal-file-dropzone-content">
                      {isTaskMissed() ? (
                        <>
                          <p className="task-detail-modal-file-dropzone-text" style={{ color: '#DC2626' }}>
                            File upload disabled - Task deadline has passed
                          </p>
                          <p className="task-detail-modal-file-dropzone-subtext" style={{ color: '#DC2626' }}>
                            Request a deadline extension to submit this task
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="task-detail-modal-file-dropzone-text">
                            Drag and drop files here, or <span className="task-detail-modal-file-dropzone-link">browse</span>
                          </p>
                          <p className="task-detail-modal-file-dropzone-subtext">
                            Supported formats: {formatFileTypes(task?.file_types_allowed)}
                          </p>
                        </>
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      className="task-detail-modal-file-input" 
                      multiple 
                      accept={getAllowedFileTypes().map(type => `.${type}`).join(',')}
                      onChange={handleFileSelect}
                      disabled={isTaskMissed()}
                    />
                  </div>
                ) : (
                  <div className="task-detail-modal-submitted-files">
                    {selectedAttempt && selectedAttempt.files && selectedAttempt.files.length > 0 ? (
                      <div className="task-detail-modal-submitted-files-list">
                        {selectedAttempt.files.map((file, index) => (
                          <div key={index} className="task-detail-modal-submitted-file-item">
                            <div className="task-detail-modal-submitted-file-info">
                              <span className="task-detail-modal-submitted-file-name">{formatFileName(file.filename)}</span>
                              <span className="task-detail-modal-submitted-file-size">{formatFileSize(file.size || 0)}</span>
                            </div>
                            <button 
                              className="task-detail-modal-submitted-file-download"
                              onClick={async (e) => {
                                e.preventDefault();
                                console.log('🔍 Download clicked for:', file.filename);
                                console.log('🔍 Download URL:', file.downloadUrl);
                                console.log('🔍 File data:', file);
                                
                                try {
                                  const token = localStorage.getItem('token');
                                  const response = await fetch(file.downloadUrl, {
                                    method: 'GET',
                                    headers: {
                                      'Authorization': `Bearer ${token}`,
                                      'Content-Type': 'application/json'
                                    }
                                  });
                                  
                                  if (!response.ok) {
                                    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
                                  }
                                  
                                  const blob = await response.blob();
                                  const url = window.URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  a.href = url;
                                  a.download = file.filename;
                                  document.body.appendChild(a);
                                  a.click();
                                  window.URL.revokeObjectURL(url);
                                  document.body.removeChild(a);
                                  
                                  console.log('✅ File downloaded successfully');
                                } catch (error) {
                                  console.error('❌ Download failed:', error);
                                  alert('Download failed: ' + error.message);
                                }
                              }}
                            >
                              Download
                </button>
              </div>
                        ))}
                      </div>
                    ) : (
                      <div className="task-detail-modal-no-files">
                        <p>No files submitted for this attempt.</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="task-detail-modal-file-list">
                  {fileError && (
                    <div className="task-detail-modal-file-error">
                      {fileError}
                    </div>
                  )}
                  {selectedFiles.length > 0 && (
                    <div className="task-detail-modal-file-items">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="task-detail-modal-file-item">
                          <div className="task-detail-modal-file-info">
                            <span className="task-detail-modal-file-name">{file.name}</span>
                            <span className="task-detail-modal-file-size">{formatFileSize(file.size)}</span>
                          </div>
                          <button 
                            className="task-detail-modal-file-remove"
                            onClick={() => removeFile(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="task-detail-modal-file-actions">
                  {isNewAttemptMode ? (
                    <>
                      <button 
                        className="task-detail-modal-file-cancel-btn"
                        onClick={clearAllFiles}
                        disabled={selectedFiles.length === 0}
                      >
                        Cancel
                      </button>
                      {isTaskMissed() ? (
                        // Show "Request Extension" button for missed tasks
                        <button 
                          className="task-detail-modal-file-extension-btn"
                          onClick={() => {
                            if (onRequestExtension) {
                              onRequestExtension();
                            }
                          }}
                          disabled={hasExtensionRequested()}
                        >
                          {hasExtensionRequested() ? 'Extension Requested' : 'Request Extension'}
                        </button>
                      ) : (
                        // Show normal submit button
                        <button 
                          className="task-detail-modal-file-submit-btn"
                          disabled={selectedFiles.length === 0 || isSubmitting || 
                            (task.status && ['completed', 'approved'].includes(task.status)) ||
                            (attemptInfo && !attemptInfo.can_submit)}
                          onClick={handleSubmitFiles}
                          title={
                            task.status && ['completed', 'approved'].includes(task.status) ? 
                              `Task status '${task.status}' - This task is already completed or approved.` :
                            attemptInfo && !attemptInfo.can_submit ?
                              `Maximum attempts (${attemptInfo.max_attempts}) exceeded.` :
                              ''
                          }
                        >
                          {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                      )}
                    </>
                  ) : (
                    <button 
                      className="task-detail-modal-new-attempt-btn"
                      onClick={handleNewAttempt}
                      disabled={attemptInfo && !attemptInfo.can_submit}
                      title={
                        attemptInfo && !attemptInfo.can_submit ?
                          `Maximum attempts (${attemptInfo.max_attempts}) exceeded.` :
                          ''
                      }
                    >
                      New Attempt
                    </button>
                  )}
                </div>
                {isTaskMissed() ? (
                  <div className="task-detail-modal-missed-warning">
                    <small>
                      <FaExclamationTriangle style={{ marginRight: '5px', color: '#ef4444' }} />
                      ⚠️ Task deadline has passed. You can request a deadline extension from your group leader.
                    </small>
                  </div>
                ) : hasExtensionRequested() ? (
                  <div className="task-detail-modal-extension-pending">
                    <small>
                      <FaHourglassHalf style={{ marginRight: '5px', color: '#f59e0b' }} />
                      📋 Extension request pending approval from your group leader.
                    </small>
                  </div>
                ) : (task.status && ['completed', 'approved'].includes(task.status)) || (attemptInfo && !attemptInfo.can_submit) ? (
                  <div className="task-detail-modal-submit-warning">
                    <small>
                      {task.status && ['completed', 'approved'].includes(task.status) ? 
                        `⚠️ Task status '${task.status}' - This task is already completed or approved` :
                        `⚠️ Maximum attempts (${attemptInfo.max_attempts}) exceeded - You have already submitted ${attemptInfo.actual_submissions} times`
                      }
                    </small>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Separator Line */}
            <div className="task-detail-modal-separator"></div>

            {/* Feedback Section - Only show when attempts exist */}
            {previousAttemptFiles && previousAttemptFiles.attempts && previousAttemptFiles.attempts.length > 0 && (
              <>
                <div className="task-detail-modal-comments-header">
                  <h3>
                    {selectedAttempt ? `Feedback on Attempt ${selectedAttempt.attempt_number}` : 'Feedback'}
                  </h3>
                </div>

                {/* Activity Feed - Moved above input */}
            <div className="task-detail-modal-activity-feed">
              {isLoading ? (
                    <div className="task-detail-modal-loading">Loading feedback...</div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="task-detail-modal-activity-item">
                    <div className="task-detail-modal-activity-avatar">
                          {comment.profile_image_url ? (
                            <img 
                              src={comment.profile_image_url} 
                              alt={comment.user}
                              className="task-detail-modal-profile-image"
                            />
                          ) : (
                            comment.avatar
                          )}
                    </div>
                    <div className="task-detail-modal-activity-content">
                      <div className="task-detail-modal-activity-text">
                        <strong>{comment.user}</strong> {comment.action}
                        {comment.content && <div className="task-detail-modal-activity-comment">{comment.content}</div>}
                      </div>
                      <div className="task-detail-modal-activity-time">
                        {comment.timestamp}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

                {/* Comment Input - Moved below feedback list */}
                <form onSubmit={handleCommentSubmit} className="task-detail-modal-comment-form">
                  <textarea
                    className="task-detail-modal-comment-input"
                    placeholder="Write feedback for this attempt..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows="3"
                  />
                  <div className="task-detail-modal-comment-actions">
                    <button type="submit" className="task-detail-modal-comment-submit">
                      Add Feedback
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
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

        .task-detail-modal-dropdown {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .task-detail-modal-dropdown-icon {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .task-detail-modal-header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .task-detail-modal-icon-btn {
          width: 36px;
          height: 36px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s ease;
        }

        .task-detail-modal-icon-btn:hover {
          background: #f3f4f6;
          color: #374151;
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

        .task-detail-modal-submission-date {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0.25rem 0 0 0;
          font-weight: 500;
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
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .task-detail-modal-detail-item label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .task-detail-modal-detail-item span {
          font-size: 1rem;
          color: #111827;
          font-weight: 500;
        }

        .task-detail-modal-status {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .task-detail-modal-comments-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          margin-top: 1rem;
        }

        .task-detail-modal-comments-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .task-detail-modal-file-upload-section {
          margin-bottom: 1.5rem;
          margin-top: -0.5rem;
        }

        .task-detail-modal-file-upload-area {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0.825rem;
          margin-top: 0.2475rem;
          padding-top: 1.5rem;
        }

        .task-detail-modal-file-dropzone {
          position: relative;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 1.1rem;
          text-align: center;
          transition: all 0.2s ease;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80px;
        }

        .task-detail-modal-file-dropzone:hover {
          border-color: #34656D;
          background: #f9fafb;
        }

        .task-detail-modal-file-dropzone-content {
          pointer-events: none;
        }

        .task-detail-modal-file-dropzone-text {
          font-size: 0.9rem;
          color: #374151;
          margin: 0 0 0.275rem 0;
        }

        .task-detail-modal-file-dropzone-link {
          color: #34656D;
          text-decoration: underline;
          cursor: pointer;
        }

        .task-detail-modal-file-dropzone-subtext {
          font-size: 0.7875rem;
          color: #6b7280;
          margin: 0;
        }

        .task-detail-modal-file-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .task-detail-modal-file-list {
          margin-top: 1rem;
          min-height: 33px;
        }

        .task-detail-modal-file-items {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .task-detail-modal-file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          gap: 1rem;
        }

        .task-detail-modal-file-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .task-detail-modal-file-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
          word-break: break-word;
        }

        .task-detail-modal-file-size {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 400;
        }

        .task-detail-modal-file-remove {
          width: 28px;
          height: 28px;
          border: none;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          font-weight: bold;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .task-detail-modal-file-remove:hover {
          background: #dc2626;
          transform: scale(1.05);
        }

        .task-detail-modal-file-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          padding: 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 0.75rem;
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .task-detail-modal-file-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.55rem;
        }

        .task-detail-modal-file-cancel-btn {
          padding: 0.5rem 1rem;
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .task-detail-modal-file-cancel-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .task-detail-modal-file-cancel-btn:disabled {
          background: #f9fafb;
          color: #9ca3af;
          border-color: #e5e7eb;
          cursor: not-allowed;
        }

        .task-detail-modal-file-submit-btn {
          padding: 0.5rem 1rem;
          background: #34656D;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .task-detail-modal-file-submit-btn:hover {
          background: #2d5a5a;
        }

        .task-detail-modal-file-submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .task-detail-modal-submit-warning {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          text-align: center;
        }

        .task-detail-modal-submit-warning small {
          color: #92400e;
          font-size: 0.75rem;
          font-weight: 500;
        }

        /* Extension Request Button */
        .task-detail-modal-file-extension-btn {
          padding: 0.5rem 1rem;
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .task-detail-modal-file-extension-btn:hover {
          background: #d97706;
        }

        .task-detail-modal-file-extension-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        /* Missed Task Warning */
        .task-detail-modal-missed-warning {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #fee2e2;
          border: 1px solid #ef4444;
          border-radius: 6px;
          text-align: center;
        }

        .task-detail-modal-missed-warning small {
          color: #991b1b;
          font-size: 0.75rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Extension Pending Warning */
        .task-detail-modal-extension-pending {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 6px;
          text-align: center;
        }

        .task-detail-modal-extension-pending small {
          color: #92400e;
          font-size: 0.75rem;
          font-weight: 500;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .task-detail-modal-separator {
          height: 1px;
          background: #e5e7eb;
          margin: 0;
          width: calc(100% + 4rem);
          margin-left: -2rem;
          margin-right: -2rem;
        }

        .task-detail-modal-comment-form {
          margin-bottom: 2rem;
        }

        .task-detail-modal-comment-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          resize: vertical;
          font-family: inherit;
          font-size: 0.875rem;
          color: #374151;
          background: white;
        }

        .task-detail-modal-comment-input:focus {
          outline: none;
          border-color: #34656D;
          box-shadow: 0 0 0 3px rgba(52, 101, 109, 0.1);
        }

        .task-detail-modal-comment-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.75rem;
        }

        .task-detail-modal-comment-submit {
          padding: 0.5rem 1rem;
          background: #34656D;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .task-detail-modal-comment-submit:hover {
          background: #2d5a5a;
        }

        .task-detail-modal-activity-feed {
          space-y: 1rem;
        }

        .task-detail-modal-activity-item {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .task-detail-modal-activity-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #8b5cf6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.875rem;
          font-weight: bold;
          flex-shrink: 0;
        }

        .task-detail-modal-profile-image {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .task-detail-modal-activity-content {
          flex: 1;
        }

        .task-detail-modal-activity-text {
          color: #111827;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .task-detail-modal-activity-comment {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          font-size: 0.875rem;
          color: #374151;
        }

        .task-detail-modal-activity-time {
          color: #34656D;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .task-detail-modal-loading {
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
          padding: 2rem;
        }


            /* Submitted Files Styles */
            .task-detail-modal-submitted-files {
              background: white;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 1rem;
            }

            .task-detail-modal-submitted-files-list {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            }

            .task-detail-modal-submitted-file-item {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 0.75rem;
              background: #f9fafb;
              border-radius: 6px;
            }

            .task-detail-modal-submitted-file-info {
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
              flex: 1;
            }

            .task-detail-modal-submitted-file-name {
              font-size: 0.875rem;
              font-weight: 500;
              color: #111827;
            }

            .task-detail-modal-submitted-file-size {
              font-size: 0.75rem;
              color: #6b7280;
            }

            .task-detail-modal-submitted-file-download {
              color: #34656D;
              text-decoration: none;
              font-size: 0.875rem;
              font-weight: 500;
              padding: 0.5rem 1rem;
              background: #f3f4f6;
              border: 1px solid #d1d5db;
              border-radius: 6px;
              transition: all 0.2s ease;
              cursor: pointer;
            }

            .task-detail-modal-submitted-file-download:hover {
              background: #e5e7eb;
              border-color: #9ca3af;
            }

            .task-detail-modal-no-files {
              text-align: center;
              color: #6b7280;
              font-size: 0.875rem;
              padding: 2rem;
              font-style: italic;
            }

            /* New Attempt Button */
            .task-detail-modal-new-attempt-btn {
              padding: 0.5rem 1rem;
              background: #34656D;
              color: white;
              border: none;
              border-radius: 6px;
              font-size: 0.875rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .task-detail-modal-new-attempt-btn:hover {
              background: #2d5a5a;
            }

            .task-detail-modal-new-attempt-btn:disabled {
              background: #9ca3af;
              cursor: not-allowed;
            }

            /* Attempts Dropdown */
            .task-detail-modal-attempts-dropdown {
              margin-left: auto;
            }

        .task-detail-modal-attempts-select {
          padding: 0.5rem 1rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 0.875rem;
          color: #374151;
          cursor: pointer;
          z-index: 1;
          position: relative;
        }

        /* Hide dropdown when modal is loading */
        .modal-loading-overlay ~ * .task-detail-modal-attempts-select {
          display: none !important;
        }

            .task-detail-modal-attempts-select:focus {
              outline: none;
              border-color: #34656D;
              box-shadow: 0 0 0 3px rgba(52, 101, 109, 0.1);
        }

        @media (max-width: 768px) {
          .task-detail-modal-container {
            width: 95%;
            max-height: 95vh;
          }

          .task-detail-modal-content {
            flex-direction: column;
          }

          .task-detail-modal-left-column {
            border-right: none;
            border-bottom: 1px solid #e5e7eb;
          }

          .task-detail-modal-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default TaskDetailModal;
