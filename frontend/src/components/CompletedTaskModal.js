import React, { useState, useEffect } from 'react';
import { FaTimes, FaClock, FaCalendarAlt, FaCheckCircle, FaFileAlt, FaDownload, FaRedo } from 'react-icons/fa';
import { apiConfig } from '../config/api';

const CompletedTaskModal = ({ isOpen, onClose, task, project, phase, source = 'completed' }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [comments, setComments] = useState([]);
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  useEffect(() => {
    if (isOpen && task) {
      console.log('🔍 CompletedTaskModal - Task data structure:', task);
      console.log('🔍 CompletedTaskModal - studentaccounts:', task.studentaccounts);
      console.log('🔍 CompletedTaskModal - assigned_by:', task.assigned_by);
      setIsModalLoading(true);
      processTaskData();
    }
  }, [isOpen, task]);

  const loadLeaderFeedback = async () => {
    if (!task) return;
    
    console.log('🔍 Loading leader feedback for completed task:', task.id);
    console.log('🔍 Task data structure:', {
      id: task.id,
      title: task.title || task.task_title,
      task_submissions: task.task_submissions,
      revision_submissions: task.revision_submissions,
      status: task.status
    });
    
    try {
      const token = localStorage.getItem('token');
      
      // First, try to get leader feedback from the task_feedback table
      const feedbackResponse = await fetch(`/api/tasks/${task.id}/feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      let leaderFeedback = null;
      
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        console.log('🔍 Task feedback data received:', feedbackData);
        
        // Look for leader feedback (is_from_leader: true)
        if (feedbackData.feedback && Array.isArray(feedbackData.feedback)) {
          const leaderFeedbacks = feedbackData.feedback.filter(fb => fb.is_from_leader === true);
          if (leaderFeedbacks.length > 0) {
            // Get the most recent leader feedback
            leaderFeedback = leaderFeedbacks[0];
            console.log('🔍 Found leader feedback from task_feedback:', leaderFeedback);
          }
        }
      }
      
      // If no leader feedback found in task_feedback, check for approved submissions with review_comments
      if (!leaderFeedback) {
        // Check for approved task submissions with review_comments (approval feedback)
        const taskSubmissionResponse = await fetch(`/api/tasks/${task.id}/submissions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (taskSubmissionResponse.ok) {
          const submissionData = await taskSubmissionResponse.json();
          console.log('🔍 Task submissions data received:', submissionData);
          
          // Look for approved submissions with review_comments
          if (submissionData.submissions && Array.isArray(submissionData.submissions)) {
            const approvedSubmission = submissionData.submissions.find(sub => 
              sub.status === 'approved' && sub.review_comments && sub.review_comments.trim()
            );
            
            if (approvedSubmission) {
              leaderFeedback = {
                id: approvedSubmission.id,
                feedback_text: approvedSubmission.review_comments,
                created_at: approvedSubmission.reviewed_at,
                leader_name: approvedSubmission.reviewed_by_name || 'Leader',
                leader_profile_image: approvedSubmission.reviewed_by_profile_image
              };
              console.log('🔍 Found approval feedback from task submission:', leaderFeedback);
            }
          }
        }
      }
      
      // If still no leader feedback, check revision submissions for approval feedback
      if (!leaderFeedback) {
        console.log('🔍 Checking revision attempts for task:', task.id);
        const revisionResponse = await fetch(`/api/tasks/${task.id}/revision-attempts`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (revisionResponse.ok) {
          const revisionData = await revisionResponse.json();
          console.log('🔍 Revision attempts data received:', revisionData);
          console.log('🔍 Revision attempts response status:', revisionResponse.status);
          
          // Look for approved revision submissions with review_comments (APPROVAL feedback)
          if (revisionData.revisions && Array.isArray(revisionData.revisions)) {
            console.log('🔍 Found revisions:', revisionData.revisions.length);
            revisionData.revisions.forEach((rev, index) => {
              console.log(`🔍 Revision ${index}:`, {
                id: rev.id,
                status: rev.status,
                review_comments: rev.review_comments,
                reviewed_at: rev.reviewed_at,
                reviewed_by_name: rev.reviewed_by_name
              });
            });
            
            const approvedRevision = revisionData.revisions.find(rev => 
              rev.status === 'approved' && rev.review_comments && rev.review_comments.trim()
            );
            
            if (approvedRevision) {
              leaderFeedback = {
                id: approvedRevision.id,
                feedback_text: approvedRevision.review_comments,
                created_at: approvedRevision.reviewed_at,
                leader_name: approvedRevision.reviewed_by_name || 'Leader',
                leader_profile_image: approvedRevision.reviewed_by_profile_image
              };
              console.log('🔍 Found APPROVAL feedback from revision submission:', leaderFeedback);
            } else {
              console.log('🔍 No approved revision with feedback found');
            }
          } else {
            console.log('🔍 No revisions array found in response');
          }
        } else {
          console.log('🔍 Revision attempts API failed:', revisionResponse.status, await revisionResponse.text());
        }
      }
      
      // If still no leader feedback, check for direct approval feedback (Workflow 1)
      if (!leaderFeedback) {
        console.log('🔍 Checking direct submissions for task:', task.id);
        const directApprovalResponse = await fetch(`/api/tasks/${task.id}/submissions`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (directApprovalResponse.ok) {
          const directData = await directApprovalResponse.json();
          console.log('🔍 Direct submissions data received:', directData);
          console.log('🔍 Direct submissions response status:', directApprovalResponse.status);
          
          // Look for approved task submissions with review_comments (DIRECT APPROVAL feedback)
          if (directData.submissions && Array.isArray(directData.submissions)) {
            console.log('🔍 Found submissions:', directData.submissions.length);
            directData.submissions.forEach((sub, index) => {
              console.log(`🔍 Submission ${index}:`, {
                id: sub.id,
                status: sub.status,
                review_comments: sub.review_comments,
                reviewed_at: sub.reviewed_at,
                reviewed_by_name: sub.reviewed_by_name
              });
            });
            
            const approvedSubmission = directData.submissions.find(sub => 
              sub.status === 'approved' && sub.review_comments && sub.review_comments.trim()
            );
            
            if (approvedSubmission) {
              leaderFeedback = {
                id: approvedSubmission.id,
                feedback_text: approvedSubmission.review_comments,
                created_at: approvedSubmission.reviewed_at,
                leader_name: approvedSubmission.reviewed_by_name || 'Leader',
                leader_profile_image: approvedSubmission.reviewed_by_profile_image
              };
              console.log('🔍 Found DIRECT APPROVAL feedback from task submission:', leaderFeedback);
            } else {
              console.log('🔍 No approved submission with feedback found');
            }
          } else {
            console.log('🔍 No submissions array found in response');
          }
        } else {
          console.log('🔍 Direct submissions API failed:', directApprovalResponse.status, await directApprovalResponse.text());
        }
      }
      
      if (leaderFeedback) {
          const processedComments = [{
            id: `leader_feedback_${leaderFeedback.id}`,
          user: leaderFeedback.leader_name || leaderFeedback.author_name || 'Leader',
            action: 'provided feedback',
            content: leaderFeedback.feedback_text,
          timestamp: new Date(leaderFeedback.created_at || leaderFeedback.reviewed_at).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit'
            }),
          avatar: (leaderFeedback.leader_name || leaderFeedback.author_name || 'Leader').charAt(0).toUpperCase(),
          profile_image_url: leaderFeedback.leader_profile_image || leaderFeedback.author_profile_image
          }];
          setComments(processedComments);
        console.log('✅ Leader feedback loaded successfully:', processedComments);
        } else {
        // No leader feedback found - don't show feedback section
        setComments([]);
        console.log('ℹ️ No leader feedback found - feedback section will be hidden');
        console.log('🔍 Final leaderFeedback value:', leaderFeedback);
      }
      
    } catch (error) {
      console.error('Error loading leader feedback:', error);
      // Don't show error message, just hide feedback section
      setComments([]);
    }
  };

  const processTaskData = async () => {
    try {
      setIsLoading(true);
      
      // Load leader feedback from API
      await loadLeaderFeedback();
      
      // Set default selected attempt
      const allSubmissions = [];
      
      if (task?.task_submissions && Array.isArray(task.task_submissions)) {
        task.task_submissions.forEach(submission => {
          const fileUrls = processFileUrls(submission.file_urls);
          allSubmissions.push({
            ...submission,
            submission_type: 'original',
            attempt_number: submission.attempt_number || 1,
            file_urls: fileUrls,
            id: submission.id || `original_${submission.attempt_number || 1}`
          });
        });
      }
      
      if (task?.revision_submissions && Array.isArray(task.revision_submissions)) {
        task.revision_submissions.forEach(revision => {
          const fileUrls = processFileUrls(revision.file_paths);
          allSubmissions.push({
            ...revision,
            submission_type: 'revision',
            attempt_number: revision.revision_attempt_number || 1,
            submission_date: revision.submitted_at,
            file_urls: fileUrls,
            id: revision.id || `revision_${revision.revision_attempt_number || 1}`
          });
        });
      }
      
      const uniqueSubmissions = allSubmissions.filter((submission, index, self) => 
        index === self.findIndex(s => s.id === submission.id)
      );
      
      const finalSubmissions = uniqueSubmissions.sort((a, b) => {
        const dateA = new Date(a.submission_date || a.created_at || a.submitted_at || 0);
        const dateB = new Date(b.submission_date || b.created_at || b.submitted_at || 0);
        return dateB - dateA;
      });
      
      if (finalSubmissions.length > 0) {
        setSelectedAttempt(finalSubmissions[0]);
      }
      
    } catch (error) {
      console.error('Error processing task data:', error);
    } finally {
      setIsLoading(false);
      setIsModalLoading(false);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not specified';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const downloadFile = async (fileUrl) => {
    try {
      console.log('🔍 Download clicked for:', fileUrl);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Use the same download endpoint as other modals
      const response = await fetch(
        `${apiConfig.baseURL}/api/student-leader/download-file?fileUrl=${encodeURIComponent(fileUrl)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed with response:', errorText);
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = formatFileName(fileUrl);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ File downloaded successfully');
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert('Download failed: ' + error.message);
    }
  };

  const processFileUrls = (fileData) => {
    if (!fileData) return [];
    
    if (Array.isArray(fileData)) {
      return fileData;
    }
    
    if (typeof fileData === 'string') {
      try {
        const parsed = JSON.parse(fileData);
        return Array.isArray(parsed) ? parsed : [fileData];
      } catch (e) {
        return [fileData];
      }
    }
    
    if (typeof fileData === 'object') {
      return Object.values(fileData);
    }
    
    return [];
  };

  const getPhaseTitle = (task, phase) => {
    if (phase?.title) return phase.title;
    if (phase?.phase_title) return phase.phase_title;
    if (phase?.name) return phase.name;
    if (task?.project_phases?.title) return task.project_phases.title;
    if (task?.phase_info?.title) return task.phase_info.title;
    if (task?.phase_name) return task.phase_name;
    if (task?.phase_info?.phase_title) return task.phase_info.phase_title;
    return 'Unknown Phase';
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

  const formatFileName = (fileUrl) => {
    if (!fileUrl) return 'Unknown File';
    
    // Extract filename from URL
    const fileName = fileUrl.split('/').pop() || 'Unknown File';
    
    // Remove any query parameters or fragments
    const cleanFileName = fileName.split('?')[0].split('#')[0];
    
    // Remove timestamp prefixes and clean up the filename
    let formattedName = cleanFileName;
    
    // Remove common timestamp patterns at the beginning
    formattedName = formattedName.replace(/^\d{13}_/, ''); // Remove 13-digit timestamp
    formattedName = formattedName.replace(/^\d{10}_/, ''); // Remove 10-digit timestamp
    formattedName = formattedName.replace(/^\d{8}_/, ''); // Remove 8-digit timestamp
    
    // If it's still very long, truncate it but keep the extension
    if (formattedName.length > 40) {
      const lastDotIndex = formattedName.lastIndexOf('.');
      if (lastDotIndex > 0) {
        const extension = formattedName.substring(lastDotIndex);
        const nameWithoutExt = formattedName.substring(0, lastDotIndex);
        const truncatedName = nameWithoutExt.substring(0, 35) + '...';
        return truncatedName + extension;
      }
    }
    
    return formattedName;
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    if (i === 0) return `${bytes} ${sizes[i]}`;
    
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
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
        <div className="task-detail-modal-header" style={{ backgroundColor: '#10b981' }}>
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
              <h2 className="task-detail-modal-title">{task?.title || 'Untitled Task'}</h2>
        </div>

            {/* Information Pills */}
            <div className="task-detail-modal-pills">
              <div className="task-detail-modal-pill">
                <FaCalendarAlt className="task-detail-modal-pill-icon" />
                <span className="task-detail-modal-pill-label">Due:</span>
                <span className="task-detail-modal-pill-value">{formatDateTime(task?.due_date)}</span>
              </div>
              <div className="task-detail-modal-pill">
                <FaClock className="task-detail-modal-pill-icon" />
                <span className="task-detail-modal-pill-label">Completed:</span>
                <span className="task-detail-modal-pill-value">{formatDateTime(task?.updated_at)}</span>
              </div>
              <div className="task-detail-modal-pill">
                <FaRedo className="task-detail-modal-pill-icon" />
                <span className="task-detail-modal-pill-label">Status:</span>
                <span className="task-detail-modal-pill-value">Completed</span>
              </div>
              {/* Late Indicator Pill */}
              {isTaskLate(task) && (
                <div className="task-detail-modal-pill" style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626'
                }}>
                  <FaCheckCircle className="task-detail-modal-pill-icon" />
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
                <p>{task?.description || 'No description available'}</p>
              </div>
          </div>

            {/* Task Details Grid */}
            <div className="task-detail-modal-details-grid">
              <div className="task-detail-modal-detail-item">
                <label>File Types Allowed:</label>
                <span>{formatFileTypes(task?.file_types_allowed)}</span>
              </div>
              <div className="task-detail-modal-detail-item">
                <label>Phase:</label>
                <span>{getPhaseTitle(task, phase)}</span>
              </div>
              <div className="task-detail-modal-detail-item">
                <label>Completed by:</label>
                <span>
          {(() => {
                    // For completed tasks, the student who completed it should be the assigned_to student
                    // Check if there's a separate student field for the assigned_to relationship
                    if (task?.student?.first_name && task?.student?.last_name) {
                      return `${task.student.first_name} ${task.student.last_name}`;
                    }
                    // Check if studentaccounts is for the assigned_to (student who completed)
                    if (task?.studentaccounts?.first_name && task?.studentaccounts?.last_name) {
                      return `${task.studentaccounts.first_name} ${task.studentaccounts.last_name}`;
                    }
                    // Fallback to string values
                    return task?.assigned_to_name || task?.student_name || 'Unknown';
                  })()}
                </span>
              </div>
              <div className="task-detail-modal-detail-item">
                <label>Assigned by:</label>
                <span>
                  {(() => {
                    // Try different possible data structures for leader information
                    if (task?.studentaccounts?.first_name && task?.studentaccounts?.last_name) {
                      return `${task.studentaccounts.first_name} ${task.studentaccounts.last_name}`;
                    }
                    // Check if there's a separate leader field
                    if (task?.leader?.first_name && task?.leader?.last_name) {
                      return `${task.leader.first_name} ${task.leader.last_name}`;
                    }
                    // Check if assigned_by is an object with name properties
                    if (typeof task?.assigned_by === 'object' && task?.assigned_by?.first_name && task?.assigned_by?.last_name) {
                      return `${task.assigned_by.first_name} ${task.assigned_by.last_name}`;
                    }
                    // Fallback to string values
                    return task?.assigned_by_name || task?.leader_name || task?.assigned_by || 'Unknown';
                  })()}
                </span>
                  </div>
                </div>
                </div>

          {/* Right Column - Approved Files and Feedback */}
          <div className="task-detail-modal-right-column">
            {/* Approved Files Section */}
            <div className="task-detail-modal-file-upload-section">
              <div className="task-detail-modal-section-header">
                <h3>Approved Submission Files</h3>
                <p className="task-detail-modal-submission-date">
                    {(() => {
                    // Find the approved submission
                    const approvedSubmission = task?.task_submissions?.find(sub => sub.status === 'approved') ||
                                            task?.revision_submissions?.find(sub => sub.status === 'approved');
                    return approvedSubmission ? 
                      formatDateTime(approvedSubmission.submission_date || approvedSubmission.submitted_at || approvedSubmission.created_at) :
                      'Not specified';
                  })()}
                </p>
                    </div>

              <div className="task-detail-modal-file-upload-area">
                    {(() => {
                  // Find the approved submission and its files
                  const approvedSubmission = task?.task_submissions?.find(sub => sub.status === 'approved') ||
                                          task?.revision_submissions?.find(sub => sub.status === 'approved');
                  
                  if (approvedSubmission) {
                    const fileUrls = processFileUrls(
                      approvedSubmission.file_urls || approvedSubmission.file_paths
                    );
                    
                    if (fileUrls && fileUrls.length > 0) {
                      return (
                        <div className="task-detail-modal-submitted-files">
                          <div className="task-detail-modal-submitted-files-list">
                            {fileUrls.map((fileUrl, index) => (
                              <div key={index} className="task-detail-modal-submitted-file-item">
                                <div className="task-detail-modal-submitted-file-info">
                                  <span 
                                    className="task-detail-modal-submitted-file-name"
                                    title={fileUrl.split('/').pop() || 'Unknown File'}
                                  >
                                    {formatFileName(fileUrl)}
                                  </span>
                                  <span className="task-detail-modal-submitted-file-size">
                                    {formatFileSize(133820)} {/* Placeholder size - you can get actual size from file data */}
                                  </span>
                                </div>
                                <button
                                  className="task-detail-modal-submitted-file-download"
                                  onClick={() => downloadFile(fileUrl)}
                                >
                                  Download
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                  }
                  
                  return (
                    <div className="task-detail-modal-no-files">
                      <p>No approved files found</p>
                        </div>
                      );
                    })()}
              </div>
            </div>

            {/* Separator Line */}
            <div className="task-detail-modal-separator"></div>

            {/* Leader Feedback Section - Only show if there are comments */}
            {comments.length > 0 && (
              <>
            <div className="task-detail-modal-comments-header">
              <h3>Leader Feedback</h3>
            </div>

            {/* Activity Feed */}
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

        .task-detail-modal-header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .task-detail-modal-close-btn {
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

        .task-detail-modal-close-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .task-detail-modal-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .task-detail-modal-left-column {
          flex: 1;
          padding: 1.5rem;
          border-right: 1px solid #e5e7eb;
          overflow-y: auto;
        }

        .task-detail-modal-right-column {
          flex: 1;
          padding: 1.5rem;
          overflow-y: auto;
        }

        .task-detail-modal-title-section {
          margin-bottom: 1.5rem;
        }

        .task-detail-modal-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0 0 0.5rem 0;
        }

        .task-detail-modal-attempts-dropdown {
          margin-top: 0.5rem;
        }

        .task-detail-modal-attempts-select {
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          background: white;
          font-size: 0.875rem;
          color: #374151;
          cursor: pointer;
          z-index: 1;
          position: relative;
        }

        .task-detail-modal-attempts-select:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }

        /* Hide dropdown when modal is loading */
        .modal-loading-overlay ~ * .task-detail-modal-attempts-select {
          display: none !important;
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

        .task-detail-modal-description-section {
          margin-bottom: 1.5rem;
        }

        .task-detail-modal-section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .task-detail-modal-section-icon {
          font-size: 1rem;
          color: #6b7280;
        }

        .task-detail-modal-section-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .task-detail-modal-description-content {
          background: #f9fafb;
          padding: 1rem;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .task-detail-modal-description-content p {
          margin: 0;
          color: #6b7280;
          line-height: 1.5;
        }

        .task-detail-modal-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .task-detail-modal-detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .task-detail-modal-detail-item label {
          font-size: 0.75rem;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .task-detail-modal-detail-item span {
          font-size: 0.875rem;
          color: #374151;
        }

        .task-detail-modal-file-upload-section {
          margin-bottom: 1.5rem;
        }

        .task-detail-modal-section-header h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .task-detail-modal-submission-date {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .task-detail-modal-file-upload-area {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          background: #f9fafb;
        }

        .task-detail-modal-submitted-files {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
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
          background: white;
          border-radius: 6px;
          padding: 0.75rem;
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
          color: #374151;
          line-height: 1.4;
          word-break: break-word;
          overflow-wrap: break-word;
          hyphens: auto;
        }

        .task-detail-modal-submitted-file-size {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 400;
        }

        .task-detail-modal-submitted-file-download {
          color: #374151;
          background: #f8f9fa;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.5rem 1rem;
          transition: all 0.2s ease;
          cursor: pointer;
          white-space: nowrap;
        }

        .task-detail-modal-submitted-file-download:hover {
          background: #e9ecef;
          border-color: #9ca3af;
        }

        .task-detail-modal-file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .task-detail-modal-file-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex: 1;
        }

        .task-detail-modal-file-icon {
          color: #6b7280;
          font-size: 1rem;
        }

        .task-detail-modal-file-name {
          font-size: 0.875rem;
          color: #374151;
          font-weight: 500;
        }

        .task-detail-modal-file-size {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .task-detail-modal-file-download-btn {
          padding: 0.5rem 1rem;
          background: #f9fafb;
          color: #374151;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .task-detail-modal-file-download-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .task-detail-modal-no-files {
          color: #6b7280;
          text-align: center;
        }

        .task-detail-modal-no-files p {
          margin: 0;
          font-size: 0.875rem;
        }

        .task-detail-modal-separator {
          height: 1px;
          background: #e5e7eb;
          margin: 1.5rem 0;
        }

        .task-detail-modal-comments-header {
          margin-bottom: 1rem;
        }

        .task-detail-modal-comments-header h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .task-detail-modal-activity-feed {
          max-height: 300px;
          overflow-y: auto;
        }

        .task-detail-modal-loading {
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
          padding: 2rem;
        }

        .task-detail-modal-activity-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f3f4f6;
        }

        .task-detail-modal-activity-item:last-child {
          border-bottom: none;
        }

        .task-detail-modal-activity-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .task-detail-modal-profile-image {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .task-detail-modal-activity-content {
          flex: 1;
        }

        .task-detail-modal-activity-text {
          font-size: 0.875rem;
          color: #374151;
          margin-bottom: 0.25rem;
        }

        .task-detail-modal-activity-comment {
          background: #f9fafb;
          padding: 0.5rem;
          border-radius: 6px;
          margin-top: 0.5rem;
          font-size: 0.8rem;
          color: #6b7280;
        }

        .task-detail-modal-activity-time {
          font-size: 0.75rem;
          color: #9ca3af;
        }
      `}</style>
    </div>
  );
};

export default CompletedTaskModal;
