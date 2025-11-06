import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaClock, FaCalendarAlt, FaRedo, FaCheckCircle, FaExclamationTriangle, FaFileAlt, FaUserTie } from 'react-icons/fa';
import { apiConfig } from '../config/api';

const RevisionModal = ({ isOpen, onClose, task, project, phase, onTaskSubmitted, originalSubmissionId }) => {
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
  const [leaderFeedback, setLeaderFeedback] = useState(null);
  const [revisionAttempts, setRevisionAttempts] = useState([]);
  const [currentRevisionNumber, setCurrentRevisionNumber] = useState(1);
  const [selectedRevisionAttempt, setSelectedRevisionAttempt] = useState(null);
  const [revisionAttemptFeedback, setRevisionAttemptFeedback] = useState({});
  const fileInputRef = useRef(null);

  // Debug: Log task data structure
  useEffect(() => {
    if (task) {
      console.log('🔍 RevisionModal - Task data structure:', task);
      console.log('🔍 RevisionModal - task status:', task.status);
      console.log('🔍 RevisionModal - revision submissions:', task.revision_submissions);
    }
  }, [task]);

  useEffect(() => {
    if (isOpen && task) {
      setIsModalLoading(true);
      // Load task data when modal opens
      Promise.all([
        loadAttemptInfo(),
        loadPreviousAttemptFiles(),
        loadRevisionAttempts()
      ]).finally(() => {
        setIsModalLoading(false);
      });
      setSelectedFiles([]); // Clear files when modal opens
      setFileError('');
    }
  }, [isOpen, task]);

  // Load leader feedback after previous attempt files are loaded
  useEffect(() => {
    if (isOpen && task && previousAttemptFiles) {
      loadLeaderFeedback();
    }
  }, [isOpen, task, previousAttemptFiles]);

  // Set selected attempt when previous attempt files load
  useEffect(() => {
    if (previousAttemptFiles && previousAttemptFiles.attempts && previousAttemptFiles.attempts.length > 0) {
      console.log('🔍 All attempts loaded:', previousAttemptFiles.attempts);
      console.log('🔍 Attempt structure:', previousAttemptFiles.attempts[0]);
      
      // Find the attempt that was marked for revision
      const revisionRequestedAttempt = previousAttemptFiles.attempts.find(attempt => 
        attempt.status === 'revision_requested' || attempt.status === 'to_revise'
      );
      
      if (revisionRequestedAttempt) {
        console.log('🔍 Found revision requested attempt:', revisionRequestedAttempt);
        console.log('🔍 Revision requested attempt ID:', revisionRequestedAttempt.id);
        setSelectedAttempt(revisionRequestedAttempt);
      } else {
        // Fallback to latest attempt if no revision_requested found
        const latestAttempt = previousAttemptFiles.attempts[previousAttemptFiles.attempts.length - 1];
        console.log('🔍 No revision requested attempt found, using latest:', latestAttempt);
        console.log('🔍 Latest attempt ID:', latestAttempt?.id);
        setSelectedAttempt(latestAttempt);
      }
    } else {
      setSelectedAttempt(null);
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
        setPreviousAttemptFiles(filesData);
      } else {
        console.error('Failed to load previous attempt files:', response.status);
      }
    } catch (error) {
      console.error('Error loading previous attempt files:', error);
    }
  };

  const loadLeaderFeedback = async () => {
    if (!task) return;
    
    console.log('🔍 Loading leader feedback for task:', task.id);
    
    // First, try to get feedback from the previousAttemptFiles data
    if (previousAttemptFiles && previousAttemptFiles.attempts && previousAttemptFiles.attempts.length > 0) {
      const revisionRequestedAttempt = previousAttemptFiles.attempts.find(attempt => 
        attempt.status === 'revision_requested'
      );
      
      if (revisionRequestedAttempt) {
        console.log('✅ Extracting leader feedback from revision requested attempt:', revisionRequestedAttempt);
        
        // Extract feedback from the attempt data
        const feedbackData = {
          feedback_text: revisionRequestedAttempt.leader_feedback || revisionRequestedAttempt.feedback || 'No specific feedback provided',
          leader_name: revisionRequestedAttempt.evaluated_by_name || 'Leader',
          created_at: revisionRequestedAttempt.evaluated_at || revisionRequestedAttempt.submission_date
        };
        
        setLeaderFeedback(feedbackData);
        console.log('✅ Leader feedback extracted from attempt data:', feedbackData);
        return;
      }
    }
    
    // If no feedback found in local data, try the API endpoint (for backwards compatibility)
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/leader-feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('🔍 Leader feedback API response status:', response.status);

      if (response.ok) {
        const feedbackData = await response.json();
        setLeaderFeedback(feedbackData.leader_feedback);
        
        // Reload comments now that we have leader feedback for filtering
        loadTaskComments(feedbackData.leader_feedback);
      } else {
        console.log('ℹ️ No leader feedback endpoint available (this is normal for task assignment revisions)');
      }
    } catch (error) {
      console.log('ℹ️ Could not load leader feedback from API (this is normal for task assignment revisions)');
    }
  };

  const loadRevisionAttempts = async () => {
    if (!task) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/revision-attempts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const revisionData = await response.json();
        console.log('🔄 Revision attempts loaded:', revisionData);
        setRevisionAttempts(revisionData.revisions || []);
        setCurrentRevisionNumber(revisionData.next_revision_number || 1);
        
        // Set the latest revision attempt as selected
        const revisions = revisionData.revisions || [];
        if (revisions.length > 0) {
          setSelectedRevisionAttempt(revisions[revisions.length - 1]);
          
          // Load feedback for each revision attempt
          revisions.forEach(revision => {
            loadRevisionAttemptFeedback(revision);
          });
        }
      } else {
        console.error('Failed to load revision attempts:', response.status);
      }
    } catch (error) {
      console.error('Error loading revision attempts:', error);
    }
  };

  const loadRevisionAttemptFeedback = async (revisionAttempt) => {
    if (!task || !revisionAttempt) return;
    
    try {
      const token = localStorage.getItem('token');
      // Use the existing feedback endpoint but filter for revision submissions
      const response = await fetch(`/api/tasks/${task.id}/revision-attempts/${revisionAttempt.revision_number}/feedback`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Use passed leader feedback data or state
        const currentLeaderFeedback = leaderFeedback;
        
        // Only filter if we have leader feedback loaded
        let filteredFeedback = data.feedback || [];
        if (currentLeaderFeedback) {
          filteredFeedback = (data.feedback || []).filter(fb => {
            // Check if this feedback matches the leader's revision request
            if (currentLeaderFeedback && fb.feedback_text === currentLeaderFeedback.feedback_text) {
              // Check if this feedback was created around the same time as the revision request
              const feedbackTime = new Date(fb.created_at);
              const revisionRequestTime = new Date(currentLeaderFeedback.created_at);
              const timeDifference = Math.abs(feedbackTime - revisionRequestTime);
              
              // If created within 1 minute of revision request, it's likely a duplicate
              if (timeDifference < 60000) { // 60 seconds
                return false; // Exclude this feedback
              } else {
                return true; // Keep this feedback (it's a separate general comment)
              }
            }
            return true; // Include all other feedback
          });
        }
        
        // Transform feedback data to match comment format
        const transformedComments = filteredFeedback.map(feedback => ({
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
        
        // Store feedback for this revision attempt
        setRevisionAttemptFeedback(prev => ({
          ...prev,
          [revisionAttempt.id]: transformedComments
        }));
      } else {
        console.error('Failed to load revision attempt feedback:', response.status);
        // If the endpoint doesn't exist, just set empty feedback
        setRevisionAttemptFeedback(prev => ({
          ...prev,
          [revisionAttempt.id]: []
        }));
      }
    } catch (error) {
      console.error('Error loading revision attempt feedback:', error);
      // If there's an error, just set empty feedback
      setRevisionAttemptFeedback(prev => ({
        ...prev,
        [revisionAttempt.id]: []
      }));
    }
  };

  const loadTaskComments = async (leaderFeedbackData = null) => {
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
        
        console.log('🔍 All feedback data received:', data.feedback);
        console.log('🔍 Current leaderFeedback state:', leaderFeedback);
        console.log('🔍 Passed leaderFeedbackData:', leaderFeedbackData);
        
        // Use passed leader feedback data or state
        const currentLeaderFeedback = leaderFeedbackData || leaderFeedback;
        
        // Only filter if we have leader feedback loaded
        let filteredFeedback = data.feedback;
        if (currentLeaderFeedback) {
          filteredFeedback = data.feedback.filter(fb => {
            // Check if this feedback matches the leader's revision request
            if (currentLeaderFeedback && fb.feedback_text === currentLeaderFeedback.feedback_text) {
              // Check if this feedback was created around the same time as the revision request
              const feedbackTime = new Date(fb.created_at);
              const revisionRequestTime = new Date(currentLeaderFeedback.created_at);
              const timeDifference = Math.abs(feedbackTime - revisionRequestTime);
              
              // If created within 1 minute of revision request, it's likely a duplicate
              if (timeDifference < 60000) { // 60 seconds
                return false; // Exclude this feedback
              } else {
                return true; // Keep this feedback (it's a separate general comment)
              }
            }
            return true; // Include all other feedback
          });
        }
        
        // Transform feedback data to match comment format
        const transformedComments = filteredFeedback.map(feedback => ({
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

  const handleSubmitRevision = async () => {
    if (selectedFiles.length === 0) {
      setFileError('Please select at least one file to submit');
      return;
    }

    try {
      setIsSubmitting(true);
      setFileError('');
      const token = localStorage.getItem('token');
      
      // Determine the original submission ID to use
      // Based on Submission Checking logic: use the ID of the submission/attempt that was marked for revision
      // The ID should be from the submission that was marked for revision:
      // - For first revision: task_submission ID
      // - For re-revision: revision_submission ID that was marked for revision
      
      let submissionIdToUse = null;
      
      console.log('🔍 Determining submission ID - Starting with:', {
        originalSubmissionId,
        revisionAttemptsCount: revisionAttempts?.length,
        hasSelectedAttempt: !!selectedAttempt,
        hasPreviousAttemptFiles: !!previousAttemptFiles
      });
      
      // Priority 1: Check revision attempts for re-revisions FIRST
      // If there are revision attempts with revision_requested status, that's what we need to revise
      if (revisionAttempts?.length > 0) {
        console.log('🔍 Checking revisionAttempts for re-revision:', revisionAttempts);
        console.log('🔍 First revision attempt structure:', revisionAttempts[0]);
        console.log('🔍 First revision attempt keys:', revisionAttempts[0] ? Object.keys(revisionAttempts[0]) : 'N/A');
        
        // Find revision with revision_requested or to_revise status
        const revisionRequested = revisionAttempts.find(
          rev => rev.status === 'revision_requested' || rev.status === 'to_revise'
        );
        
        if (revisionRequested) {
          console.log('🔍 Found revision_requested revision:', revisionRequested);
          console.log('🔍 Full revision_requested object:', JSON.stringify(revisionRequested, null, 2));
          
          // For re-revisions, the backend expects the original_submission_id from task_submissions table
          // NOT the revision submission ID itself. All revisions link back to the same original task submission.
          // We can get this from previousAttemptFiles.attempts which contains the original task submissions.
          if (previousAttemptFiles?.attempts?.length > 0) {
            console.log('🔍 Checking previousAttemptFiles.attempts for original task submission:', previousAttemptFiles.attempts);
            // All revisions link back to the same original task submission
            // Find the first attempt with a submission_id (that's the original task submission)
            const originalTaskSubmission = previousAttemptFiles.attempts.find(
              attempt => attempt.submission_id
            );
            if (originalTaskSubmission?.submission_id) {
              submissionIdToUse = originalTaskSubmission.submission_id;
              console.log('✅ Using original task submission ID from previousAttemptFiles (re-revision):', submissionIdToUse);
            }
          }
          
          // Fallback: if previousAttemptFiles doesn't have it, use the originalSubmissionId passed from task card
          // This should be the original task submission ID (for re-revisions, task card should pass the original)
          if (!submissionIdToUse && originalSubmissionId) {
            submissionIdToUse = originalSubmissionId;
            console.log('✅ Using originalSubmissionId from task card (re-revision fallback):', submissionIdToUse);
          }
          
          // Final fallback: use revision ID (will likely fail but better than nothing)
          if (!submissionIdToUse && revisionRequested.id) {
            submissionIdToUse = revisionRequested.id;
            console.log('⚠️ Using revision_requested.id as final fallback (may fail - backend expects task_submission ID):', submissionIdToUse);
          }
        } else {
          // If no revision is marked revision_requested, check if latest is pending (might have been marked for revision)
          // Or use the latest revision as fallback for re-revisions
          const latestRevision = revisionAttempts[revisionAttempts.length - 1];
          console.log('🔍 No revision_requested found, using latest revision:', latestRevision);
          if (latestRevision) {
            // For re-revisions, use original_submission_id from the revision
            if (latestRevision.original_submission_id) {
              submissionIdToUse = latestRevision.original_submission_id;
              console.log('✅ Using latest revision original_submission_id (re-revision fallback):', submissionIdToUse);
            } else if (latestRevision.original_submission?.id) {
              submissionIdToUse = latestRevision.original_submission.id;
              console.log('✅ Using latest revision original_submission.id (re-revision fallback):', submissionIdToUse);
            } else if (latestRevision.id) {
              submissionIdToUse = latestRevision.id;
              console.log('⚠️ Using latest revision ID as fallback (may fail - backend expects task_submission ID):', submissionIdToUse);
            } else if (latestRevision.submission_id) {
              submissionIdToUse = latestRevision.submission_id;
              console.log('⚠️ Using latest revision submission_id as fallback (may fail - backend expects task_submission ID):', submissionIdToUse);
            }
          }
        }
      }
      
      // Priority 2: Use passed originalSubmissionId if available (comes from task card click)
      // This is for first-time revisions when there are no revision attempts yet
      if (!submissionIdToUse && originalSubmissionId) {
        submissionIdToUse = originalSubmissionId;
        console.log('✅ Using passed originalSubmissionId (first revision):', submissionIdToUse);
      }
      
      // Priority 3: Check selectedAttempt from previousAttemptFiles (for first-time revisions)
      // selectedAttempt is set to the attempt with revision_requested status
      if (!submissionIdToUse && selectedAttempt) {
        console.log('🔍 Checking selectedAttempt:', selectedAttempt);
        // Check multiple possible ID fields
        if (selectedAttempt.id) {
          submissionIdToUse = selectedAttempt.id;
          console.log('✅ Using selectedAttempt.id (first revision):', submissionIdToUse);
        } else if (selectedAttempt.submission_id) {
          submissionIdToUse = selectedAttempt.submission_id;
          console.log('✅ Using selectedAttempt.submission_id (first revision):', submissionIdToUse);
        } else if (selectedAttempt.original_submission?.id) {
          submissionIdToUse = selectedAttempt.original_submission.id;
          console.log('✅ Using selectedAttempt.original_submission.id (first revision):', submissionIdToUse);
        }
      }
      
      // Priority 4: Find from previousAttemptFiles attempts array
      if (!submissionIdToUse && previousAttemptFiles?.attempts?.length > 0) {
        console.log('🔍 Checking previousAttemptFiles.attempts:', previousAttemptFiles.attempts);
        // Find the attempt marked for revision
        const revisionRequestedAttempt = previousAttemptFiles.attempts.find(
          attempt => attempt.status === 'revision_requested' || attempt.status === 'to_revise'
        );
        if (revisionRequestedAttempt) {
          // Check multiple possible ID fields
          if (revisionRequestedAttempt.id) {
            submissionIdToUse = revisionRequestedAttempt.id;
            console.log('✅ Using revision_requested attempt.id:', submissionIdToUse);
          } else if (revisionRequestedAttempt.submission_id) {
            submissionIdToUse = revisionRequestedAttempt.submission_id;
            console.log('✅ Using revision_requested attempt.submission_id:', submissionIdToUse);
          } else if (revisionRequestedAttempt.original_submission?.id) {
            submissionIdToUse = revisionRequestedAttempt.original_submission.id;
            console.log('✅ Using revision_requested attempt.original_submission.id:', submissionIdToUse);
          }
        } else {
          // Fallback to latest attempt
          const latestAttempt = previousAttemptFiles.attempts[previousAttemptFiles.attempts.length - 1];
          if (latestAttempt) {
            if (latestAttempt.id) {
              submissionIdToUse = latestAttempt.id;
              console.log('✅ Using latest attempt.id:', submissionIdToUse);
            } else if (latestAttempt.submission_id) {
              submissionIdToUse = latestAttempt.submission_id;
              console.log('✅ Using latest attempt.submission_id:', submissionIdToUse);
            } else if (latestAttempt.original_submission?.id) {
              submissionIdToUse = latestAttempt.original_submission.id;
              console.log('✅ Using latest attempt.original_submission.id:', submissionIdToUse);
            }
          }
        }
      }
      
      if (!submissionIdToUse) {
        console.error('❌ Could not find original submission ID:', {
          originalSubmissionId,
          revisionAttempts,
          selectedAttempt,
          previousAttemptFiles,
          task: task?.id
        });
        setFileError('Original submission not found. Please refresh and try again.');
        setIsSubmitting(false);
        return;
      }
      
      console.log('✅ Final submission ID to use:', submissionIdToUse);
      
      // Create FormData with files
      const formData = new FormData();
      selectedFiles.forEach(fileObj => {
        formData.append('files', fileObj.file);
      });
      formData.append('task_id', task.id);
      formData.append('original_submission_id', submissionIdToUse);
      formData.append('submission_text', '');

      console.log('📤 Submitting revision:', task.id, 'with', selectedFiles.length, 'files');
      console.log('📤 Original submission ID:', submissionIdToUse);
      console.log('📤 Revision number:', currentRevisionNumber);

      // Submit revision directly with files
      const revisionResponse = await fetch('/api/student/submit-revision', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await revisionResponse.json();

      if (revisionResponse.ok) {
        console.log('✅ Revision submitted successfully:', data);
        
        alert(`Revision ${currentRevisionNumber} submitted successfully!`);
        
        // Clear selected files
        setSelectedFiles([]);
        
        // Reload revision attempts to show the new submission
        loadRevisionAttempts();
        
        // Close modal
        onClose();
        
        // Call the callback to refresh parent component data
        if (onTaskSubmitted) {
          onTaskSubmitted();
        }
      } else {
        console.error('❌ Revision submission failed:', data);
        setFileError(data.error || 'Failed to submit revision');
      }
    } catch (error) {
      console.error('❌ Revision submission error:', error);
      setFileError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };  const getPhaseTitle = (task, phase) => {
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
    if (!bytes || bytes === 0) return 'Unknown size';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    if (i === 0) return `${bytes} ${sizes[i]}`;
    
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getFileSizeFromUrl = async (fileUrl) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const response = await fetch(
        `${apiConfig.baseURL}/api/student-leader/download-file?fileUrl=${encodeURIComponent(fileUrl)}`,
        {
          method: 'HEAD', // Use HEAD request to get headers without downloading the file
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.ok) {
        const contentLength = response.headers.get('content-length');
        return contentLength ? parseInt(contentLength, 10) : null;
      }
    } catch (error) {
      console.error('Error fetching file size:', error);
    }
    return null;
  };

  // Component to display file size with dynamic fetching
  const FileSizeDisplay = ({ file, fileUrl }) => {
    const [fileSize, setFileSize] = useState(file.size || 0);

    useEffect(() => {
      const fetchFileSize = async () => {
        if (file.size && file.size > 0) {
          setFileSize(file.size);
          return;
        }

        if (fileUrl) {
          try {
            const size = await getFileSizeFromUrl(fileUrl);
            if (size) {
              setFileSize(size);
            }
          } catch (error) {
            console.error('Error fetching file size:', error);
          }
        }
      };

      fetchFileSize();
    }, [file.size, fileUrl]);

    return <span className="revision-modal-submitted-file-size">{formatFileSize(fileSize)}</span>;
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      
      // Determine which endpoint to use based on what's selected
      let endpoint;
      if (selectedRevisionAttempt) {
        // Submit feedback for revision attempt - use the revision submission ID
        endpoint = `/api/tasks/${task.id}/revision-attempts/${selectedRevisionAttempt.revision_number}/feedback`;
        console.log('🔍 Submitting feedback for revision attempt:', {
          taskId: task.id,
          revisionId: selectedRevisionAttempt.id,
          revisionNumber: selectedRevisionAttempt.revision_number,
          endpoint
        });
      } else if (selectedAttempt) {
        // Submit feedback for regular attempt
        endpoint = `/api/tasks/${task.id}/attempts/${selectedAttempt.attempt_number}/feedback`;
        console.log('🔍 Submitting feedback for regular attempt:', {
          taskId: task.id,
          attemptNumber: selectedAttempt.attempt_number,
          endpoint
        });
      } else {
        console.error('No attempt selected for feedback submission');
        return;
      }

      const response = await fetch(endpoint, {
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
        if (selectedRevisionAttempt) {
          await loadRevisionAttemptFeedback(selectedRevisionAttempt);
        } else {
          await loadTaskComments();
        }
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
    <div className="revision-modal-overlay" onClick={onClose}>
      <div className="revision-modal-container" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
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
              borderTop: '3px solid #dc2626', // Revision color
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '1rem'
            }}></div>
            <div style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: '#dc2626',
              textAlign: 'center'
            }}>
              Loading...
            </div>
          </div>
        )}
        {/* Modal Header */}
        <div className="revision-modal-header" style={{ backgroundColor: '#dc2626' }}>
          <div className="revision-modal-header-left">
            {/* Removed "This Week" section */}
          </div>
          <div className="revision-modal-header-right">
            <button className="revision-modal-close-btn" onClick={onClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="revision-modal-content">
          {/* Left Column - Task Details */}
          <div className="revision-modal-left-column">
            {/* Task Title */}
            <div className="revision-modal-title-section">
              <h2 className="revision-modal-title">
                {task.title || 'Untitled Task'} - Revision {currentRevisionNumber}
              </h2>
              {revisionAttempts.length > 0 && (
                <div className="revision-modal-attempts-dropdown">
                  <select 
                    value={selectedRevisionAttempt?.revision_number || ''} 
                    onChange={(e) => {
                      const revisionNumber = parseInt(e.target.value);
                      const revision = revisionAttempts.find(r => r.revision_number === revisionNumber);
                      setSelectedRevisionAttempt(revision);
                    }}
                    className="revision-modal-attempts-select"
                    disabled={isModalLoading}
                  >
                    {revisionAttempts.map((revision) => (
                      <option key={revision.revision_number} value={revision.revision_number}>
                        Revision {revision.revision_number}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Information Pills */}
            <div className="revision-modal-pills">
              <div className="revision-modal-pill">
                <FaCalendarAlt className="revision-modal-pill-icon" />
                <span className="revision-modal-pill-label">Due:</span>
                <span className="revision-modal-pill-value">{formatDateTime(task.due_date)}</span>
              </div>
              <div className="revision-modal-pill">
                <FaClock className="revision-modal-pill-icon" />
                <span className="revision-modal-pill-label">Available Until:</span>
                <span className="revision-modal-pill-value">{formatDateTime(task.available_until)}</span>
              </div>
              <div className="revision-modal-pill">
                <FaRedo className="revision-modal-pill-icon" />
                <span className="revision-modal-pill-label">Revision Attempts:</span>
                <span className="revision-modal-pill-value">
                  {revisionAttempts.length}/1
                </span>
              </div>
              {/* Late Indicator Pill */}
              {isTaskLate(task) && (
                <div className="revision-modal-pill" style={{
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#dc2626'
                }}>
                  <FaExclamationTriangle className="revision-modal-pill-icon" />
                  <span className="revision-modal-pill-label">Status:</span>
                  <span className="revision-modal-pill-value" style={{ fontWeight: 'bold' }}>Late</span>
                </div>
              )}
            </div>

            {/* Description Section */}
            <div className="revision-modal-description-section">
              <div className="revision-modal-section-header">
                <div className="revision-modal-section-icon">☰</div>
                <h3>Description</h3>
              </div>
              <div className="revision-modal-description-content">
                <p>{task.description || 'No description available'}</p>
              </div>
            </div>


            {/* Submitted File Section */}
            {selectedAttempt && (
              <div className="revision-modal-submitted-file-section">
                <div className="revision-modal-section-header">
                  <FaFileAlt className="revision-modal-section-icon" />
                  <h3>Submitted File (Attempt {selectedAttempt.attempt_number})</h3>
                </div>
                <div className="revision-modal-submitted-file-content">
                  {selectedAttempt.files && selectedAttempt.files.length > 0 ? (
                    <div className="revision-modal-submitted-files-list">
                      {selectedAttempt.files.map((file, index) => (
                        <div key={index} className="revision-modal-submitted-file-item">
                          <div className="revision-modal-submitted-file-info">
                            <span className="revision-modal-submitted-file-name">{formatFileName(file.filename)}</span>
                            <FileSizeDisplay file={file} fileUrl={file.downloadUrl} />
                          </div>
                          <button 
                            className="revision-modal-submitted-file-download"
                            onClick={async (e) => {
                              e.preventDefault();
                              try {
                                const token = localStorage.getItem('token');
                                if (!token) {
                                  throw new Error('No authentication token found');
                                }
                                
                                // Use the proper download endpoint
                                const response = await fetch(
                                  `${apiConfig.baseURL}/api/student-leader/download-file?fileUrl=${encodeURIComponent(file.downloadUrl)}`,
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
                    <div className="revision-modal-no-files">
                      <p>No files submitted for this attempt.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Task Details Grid */}
            <div className="revision-modal-details-grid">
              <div className="revision-modal-detail-item">
                <label>File Types Allowed:</label>
                <span>{formatFileTypes(task.file_types_allowed)}</span>
              </div>
              <div className="revision-modal-detail-item">
                <label>Phase:</label>
                <span>{getPhaseTitle(task, phase)}</span>
              </div>
              <div className="revision-modal-detail-item">
                <label>Assigned by:</label>
                <span>{task.studentaccounts?.first_name && task.studentaccounts?.last_name 
                  ? `${task.studentaccounts.first_name} ${task.studentaccounts.last_name}`
                  : task.assigned_by_name || task.leader_name || task.assigned_by || 'Unknown'}</span>
              </div>
              <div className="revision-modal-detail-item">
                <label>Assigned at:</label>
                <span>{task.created_at ? formatDateTime(task.created_at) : 'Not specified'}</span>
              </div>
            </div>
          </div>

          {/* Right Column - File Upload and Feedback */}
          <div className="revision-modal-right-column">
            {/* Leader Request Section */}
            {leaderFeedback && (
              <div className="revision-modal-leader-request-section">
                <div className="revision-modal-section-header">
                  <h3>Leader Request</h3>
                </div>
                <div className="revision-modal-leader-request-content">
                  <div className="revision-modal-leader-info">
                    <strong>Leader:</strong> {leaderFeedback.leader_name || 'Unknown Leader'}
                  </div>
                  <div className="revision-modal-leader-feedback">
                    <strong>Feedback:</strong>
                    <p>{leaderFeedback.feedback_text || 'No specific feedback provided'}</p>
                  </div>
                  <div className="revision-modal-leader-date">
                    <strong>Requested on:</strong> {formatDateTime(leaderFeedback.created_at)}
                  </div>
                </div>
              </div>
            )}

            {/* File Section - Shows either selected revision files or file upload */}
            <div className="revision-modal-file-upload-section">
              <div className="revision-modal-section-header">
                <h3>{selectedRevisionAttempt ? `Revision ${selectedRevisionAttempt.revision_number} Files` : 'Revision File Upload'}</h3>
                <p className="revision-modal-submission-date">
                  {selectedRevisionAttempt ? 
                    `Submitted: ${new Date(selectedRevisionAttempt.submitted_at).toLocaleDateString()}` : 
                    `Revision ${currentRevisionNumber}`
                  }
                </p>
              </div>
              {selectedRevisionAttempt ? (
                // Show selected revision attempt files
                <div className="revision-modal-submitted-files">
                  {selectedRevisionAttempt.files && selectedRevisionAttempt.files.length > 0 ? (
                    <div className="revision-modal-submitted-files-list">
                      {selectedRevisionAttempt.files.map((file, index) => (
                        <div key={index} className="revision-modal-submitted-file-item">
                          <div className="revision-modal-submitted-file-info">
                            <span className="revision-modal-submitted-file-name">{formatFileName(file.filename)}</span>
                            <FileSizeDisplay file={file} fileUrl={file.downloadUrl} />
                          </div>
                          <button 
                            className="revision-modal-submitted-file-download"
                            onClick={async (e) => {
                              e.preventDefault();
                              console.log('🔍 Download clicked for:', file.filename);
                              console.log('🔍 Download URL:', file.downloadUrl);
                              try {
                                const token = localStorage.getItem('token');
                                if (!token) {
                                  throw new Error('No authentication token found');
                                }
                                
                                // Use the proper download endpoint
                                const response = await fetch(
                                  `${apiConfig.baseURL}/api/student-leader/download-file?fileUrl=${encodeURIComponent(file.downloadUrl)}`,
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
                    <div className="revision-modal-no-files">
                      <p>No files found for this revision attempt.</p>
                    </div>
                  )}
                  <div className="revision-modal-file-actions">
                    {/* Re-Revision Pill - Show ONLY when leader has requested another revision 
                        (latest revision status is revision_requested or to_revise) 
                        AND there are multiple revisions (meaning it's a re-revision scenario) */}
                    {(() => {
                      const latestRevision = revisionAttempts.length > 0 ? revisionAttempts[revisionAttempts.length - 1] : null;
                      // Only show if latest revision is revision_requested (leader requested revision of revision)
                      // AND there are multiple revisions (meaning this is a re-revision scenario)
                      const isReRevision = latestRevision && 
                        (latestRevision.status === 'revision_requested' || latestRevision.status === 'to_revise') &&
                        revisionAttempts.length > 1;
                      
                      return isReRevision && (
                        <div className="revision-modal-revision-pill" style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#dc2626',
                          marginRight: 'auto'
                        }}>
                          Re-Revision, please create new attempt
                        </div>
                      );
                    })()}
                    <button 
                      className="revision-modal-file-submit-btn"
                      onClick={() => {
                        // Switch to file upload mode for new revision
                        setSelectedRevisionAttempt(null);
                      }}
                    >
                      New Revision Attempt
                    </button>
                  </div>
                </div>
              ) : (
                // Show file upload area for new revision
                <div className="revision-modal-file-upload-area">
                <div 
                  className="revision-modal-file-dropzone"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    handleFileSelect({ target: { files: e.dataTransfer.files } });
                  }}
                  onClick={(e) => {
                    // Only trigger file input if clicking on the dropzone itself, not on child elements
                    if (e.target === e.currentTarget || e.target.classList.contains('revision-modal-file-dropzone-content')) {
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                    }
                  }}
                >
                  <div className="revision-modal-file-dropzone-content">
                    <p className="revision-modal-file-dropzone-text">
                      Drag and drop files here, or <span className="revision-modal-file-dropzone-link">browse</span>
                    </p>
                    <p className="revision-modal-file-dropzone-subtext">
                      Supported formats: {formatFileTypes(task?.file_types_allowed)}
                    </p>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="revision-modal-file-input" 
                    multiple 
                    accept={getAllowedFileTypes().map(type => `.${type}`).join(',')}
                    onChange={handleFileSelect}
                  />
                </div>
                
                <div className="revision-modal-file-list">
                  {fileError && (
                    <div className="revision-modal-file-error">
                      {fileError}
                    </div>
                  )}
                  {selectedFiles.length > 0 && (
                    <div className="revision-modal-file-items">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="revision-modal-file-item">
                          <div className="revision-modal-file-info">
                            <span className="revision-modal-file-name">{file.name}</span>
                            <span className="revision-modal-file-size">{formatFileSize(file.size)}</span>
                          </div>
                          <button 
                            className="revision-modal-file-remove"
                            onClick={() => removeFile(index)}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="revision-modal-file-actions">
                  <button 
                    className="revision-modal-file-cancel-btn"
                    onClick={clearAllFiles}
                    disabled={selectedFiles.length === 0}
                  >
                    Cancel
                  </button>
                  <button 
                    className="revision-modal-file-submit-btn"
                    disabled={selectedFiles.length === 0 || isSubmitting || (() => {
                      // Check if we should disable the submit button
                      if (revisionAttempts.length === 0) return false; // No revisions yet, allow submission
                      
                      // Check the LATEST (most recent) revision attempt
                      const latestRevision = revisionAttempts[revisionAttempts.length - 1];
                      
                      // Only block if the latest revision is still PENDING (under review)
                      // Allow if it's marked for REVISION (revision_requested)
                      if (latestRevision?.status === 'pending') return true; // Block - still under review
                      if (latestRevision?.status === 'revision_requested') return false; // Allow - needs revision
                      if (latestRevision?.status === 'approved') return false; // Allow - can submit new revision even after approval
                      
                      return false; // Default to allow
                    })()}
                    onClick={handleSubmitRevision}
                    title={
                      revisionAttempts.length >= 1 && revisionAttempts[revisionAttempts.length - 1]?.status === 'pending' ?
                        'Cannot submit new revision while previous revision is under review.' :
                        ''
                    }
                  >
                    {isSubmitting ? 'Submitting...' : `Submit Revision ${currentRevisionNumber}`}
                  </button>
                </div>
                {revisionAttempts.length >= 1 && revisionAttempts[revisionAttempts.length - 1]?.status === 'pending' ? (
                  <div className="revision-modal-submit-warning">
                    <small>
                      ⚠️ Your previous revision is currently under review
                    </small>
                  </div>
                ) : revisionAttempts.length >= 1 && revisionAttempts[revisionAttempts.length - 1]?.status === 'revision_requested' ? (
                  <div className="revision-modal-submit-warning">
                    <small>
                      ℹ️ Your revision was requested to be revised. You can submit another revision below.
                    </small>
                  </div>
                ) : null}
              </div>
              )}
            </div>

            {/* Separator Line */}
            <div className="revision-modal-separator"></div>

            {/* Feedback Section - Show feedback for selected revision attempt */}
            {revisionAttempts.length > 0 && selectedRevisionAttempt && (
              <>
                <div className="revision-modal-comments-header">
                  <h3>
                    Revision Attempt {selectedRevisionAttempt.revision_number} Feedback
                  </h3>
                </div>

                {/* Activity Feed for the selected revision attempt */}
                <div className="revision-modal-activity-feed">
                  {isLoading ? (
                    <div className="revision-modal-loading">Loading feedback...</div>
                  ) : (
                    (revisionAttemptFeedback[selectedRevisionAttempt.id] || []).map((comment) => (
                      <div key={`${selectedRevisionAttempt.id}-${comment.id}`} className="revision-modal-activity-item">
                        <div className="revision-modal-activity-avatar">
                          {comment.profile_image_url ? (
                            <img 
                              src={comment.profile_image_url} 
                              alt={comment.user}
                              className="revision-modal-profile-image"
                            />
                          ) : (
                            comment.avatar
                          )}
                        </div>
                        <div className="revision-modal-activity-content">
                          <div className="revision-modal-activity-text">
                            <strong>{comment.user}</strong> {comment.action}
                            {comment.content && <div className="revision-modal-activity-comment">{comment.content}</div>}
                          </div>
                          <div className="revision-modal-activity-time">
                            {comment.timestamp}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                <form onSubmit={handleCommentSubmit} className="revision-modal-comment-form">
                  <textarea
                    className="revision-modal-comment-input"
                    placeholder="Write feedback for this revision..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows="3"
                  />
                  <div className="revision-modal-comment-actions">
                    <button type="submit" className="revision-modal-comment-submit">
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
        .revision-modal-overlay {
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

        .revision-modal-container {
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

        .revision-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.9rem 1.2rem;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .revision-modal-header-left {
          display: flex;
          align-items: center;
        }

        .revision-modal-header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .revision-modal-close-btn {
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

        .revision-modal-close-btn:hover {
          background: #dc2626;
        }

        .revision-modal-content {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .revision-modal-left-column {
          flex: 1.53;
          padding: 2rem;
          overflow-y: auto;
          border-right: 1px solid #e5e7eb;
        }

        .revision-modal-right-column {
          flex: 1;
          padding: 2rem;
          overflow-y: auto;
          background: #f9fafb;
        }

        .revision-modal-title-section {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .revision-modal-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #111827;
          margin: 0;
          line-height: 1.3;
        }

        .revision-modal-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-bottom: 2rem;
          margin-top: 1rem;
        }

        .revision-modal-pill {
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

        .revision-modal-pill-icon {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .revision-modal-pill-label {
          font-weight: 500;
          color: #6b7280;
        }

        .revision-modal-pill-value {
          font-weight: 600;
          color: #111827;
        }

        .revision-modal-description-section,
        .revision-modal-leader-request-section,
        .revision-modal-submitted-file-section {
          margin-bottom: 2rem;
        }

        .revision-modal-section-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .revision-modal-section-icon {
          font-size: 1.25rem;
          color: #6b7280;
        }

        .revision-modal-section-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .revision-modal-submission-date {
          font-size: 0.875rem;
          color: #6b7280;
          margin: 0.25rem 0 0 0;
          font-weight: 500;
        }

        .revision-modal-description-content,
        .revision-modal-leader-request-content,
        .revision-modal-submitted-file-content {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 1rem;
          min-height: 120px;
          max-height: 200px;
          overflow-y: auto;
        }

        .revision-modal-description-content p {
          margin: 0;
          color: #374151;
          line-height: 1.6;
        }

        .revision-modal-leader-info,
        .revision-modal-leader-feedback,
        .revision-modal-leader-date {
          margin-bottom: 1rem;
        }

        .revision-modal-leader-feedback p {
          margin: 0.5rem 0 0 0;
          color: #374151;
          line-height: 1.6;
        }

        .revision-modal-submitted-files-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .revision-modal-submitted-file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: #f9fafb;
          border-radius: 6px;
        }

        .revision-modal-submitted-file-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          flex: 1;
        }

        .revision-modal-submitted-file-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
        }

        .revision-modal-submitted-file-size {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .revision-modal-submitted-file-download {
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

        .revision-modal-submitted-file-download:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .revision-modal-no-files {
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
          padding: 2rem;
          font-style: italic;
        }

        .revision-modal-details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .revision-modal-detail-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
        }

        .revision-modal-detail-item label {
          font-size: 0.875rem;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .revision-modal-detail-item span {
          font-size: 1rem;
          color: #111827;
          font-weight: 500;
        }

        .revision-modal-file-upload-section {
          margin-bottom: 1.5rem;
          margin-top: -0.5rem;
        }

        .revision-modal-file-upload-area {
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          padding: 0.825rem;
          margin-top: 0.2475rem;
          padding-top: 1.5rem;
        }

        .revision-modal-file-dropzone {
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

        .revision-modal-file-dropzone:hover {
          border-color: #dc2626;
          background: #f9fafb;
        }

        .revision-modal-file-dropzone-content {
          pointer-events: none;
        }

        .revision-modal-file-dropzone-text {
          font-size: 0.9rem;
          color: #374151;
          margin: 0 0 0.275rem 0;
        }

        .revision-modal-file-dropzone-link {
          color: #dc2626;
          text-decoration: underline;
          cursor: pointer;
        }

        .revision-modal-file-dropzone-subtext {
          font-size: 0.7875rem;
          color: #6b7280;
          margin: 0;
        }

        .revision-modal-file-input {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          cursor: pointer;
        }

        .revision-modal-file-list {
          margin-top: 1rem;
          min-height: 33px;
        }

        .revision-modal-file-items {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .revision-modal-file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          gap: 1rem;
        }

        .revision-modal-file-info {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .revision-modal-file-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: #111827;
          word-break: break-word;
        }

        .revision-modal-file-size {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 400;
        }

        .revision-modal-file-remove {
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

        .revision-modal-file-remove:hover {
          background: #dc2626;
          transform: scale(1.05);
        }

        .revision-modal-file-error {
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

        .revision-modal-file-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.5rem;
          margin-top: 0.55rem;
        }

        .revision-modal-file-cancel-btn {
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

        .revision-modal-file-cancel-btn:hover {
          background: #e5e7eb;
          border-color: #9ca3af;
        }

        .revision-modal-file-cancel-btn:disabled {
          background: #f9fafb;
          color: #9ca3af;
          border-color: #e5e7eb;
          cursor: not-allowed;
        }

        .revision-modal-file-submit-btn {
          padding: 0.5rem 1rem;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .revision-modal-file-submit-btn:hover {
          background: #b91c1c;
        }

        .revision-modal-file-submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
        }

        .revision-modal-submit-warning {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #fef2f2;
          border: 1px solid #dc2626;
          border-radius: 6px;
          text-align: center;
        }

        .revision-modal-submit-warning small {
          color: #dc2626;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .revision-modal-submitted-files {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 1rem;
        }

        .revision-modal-submitted-files-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .revision-modal-submitted-file-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
        }

        .revision-modal-submitted-file-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .revision-modal-submitted-file-name {
          font-weight: 500;
          color: #111827;
          font-size: 0.875rem;
        }

        .revision-modal-submitted-file-size {
          color: #6b7280;
          font-size: 0.75rem;
        }

        .revision-modal-submitted-file-download {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .revision-modal-submitted-file-download:hover {
          background: #2563eb;
        }

        .revision-modal-no-files {
          padding: 2rem;
          text-align: center;
          color: #6b7280;
          font-style: italic;
        }

        .revision-modal-separator {
          height: 1px;
          background: #e5e7eb;
          margin: 0;
          width: calc(100% + 4rem);
          margin-left: -2rem;
          margin-right: -2rem;
        }

        .revision-modal-comment-form {
          margin-bottom: 2rem;
        }

        .revision-modal-comment-input {
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

        .revision-modal-comment-input:focus {
          outline: none;
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .revision-modal-comment-actions {
          display: flex;
          justify-content: flex-end;
          margin-top: 0.75rem;
        }

        .revision-modal-comment-submit {
          padding: 0.5rem 1rem;
          background: #dc2626;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .revision-modal-comment-submit:hover {
          background: #b91c1c;
        }

        .revision-modal-activity-feed {
          space-y: 1rem;
        }

        .revision-modal-activity-item {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .revision-modal-activity-avatar {
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

        .revision-modal-profile-image {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          flex-shrink: 0;
        }

        .revision-modal-activity-content {
          flex: 1;
        }

        .revision-modal-activity-text {
          color: #111827;
          font-size: 0.875rem;
          line-height: 1.5;
        }

        .revision-modal-activity-comment {
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
          font-size: 0.875rem;
          color: #374151;
        }

        .revision-modal-activity-time {
          color: #dc2626;
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }

        .revision-modal-loading {
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
          padding: 2rem;
        }

        .revision-modal-attempts-dropdown {
          margin-left: auto;
        }

        .revision-modal-attempts-select {
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

        .revision-modal-attempts-select:focus {
          outline: none;
          border-color: #dc2626;
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        /* Hide dropdown when modal is loading */
        .modal-loading-overlay ~ * .revision-modal-attempts-select {
          display: none !important;
        }

        .revision-modal-comments-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          margin-top: 1rem;
        }

        .revision-modal-comments-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        @media (max-width: 768px) {
          .revision-modal-container {
            width: 95%;
            max-height: 95vh;
          }

          .revision-modal-content {
            flex-direction: column;
          }

          .revision-modal-left-column {
            border-right: none;
            border-bottom: 1px solid #e5e7eb;
          }

          .revision-modal-details-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default RevisionModal;
