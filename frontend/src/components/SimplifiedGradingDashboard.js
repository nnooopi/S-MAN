import React, { useState, useEffect } from 'react';
import { ArrowLeft, FileText, Clock, User, Download, AlertCircle, ChevronDown } from 'lucide-react';
import './SimplifiedGradingDashboard.css';

const API_BASE_URL = 'http://localhost:5000/api/grading-clean';

const SimplifiedGradingDashboard = ({ courseId, projectId, onBack }) => {
  const [project, setProject] = useState(null);
  const [course, setCourse] = useState(null);
  const [groupsData, setGroupsData] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch project and course data when component mounts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch project data
        const projectResponse = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!projectResponse.ok) {
          throw new Error('Failed to fetch project data');
        }
        
        const projectData = await projectResponse.json();
        setProject(projectData);
        
        // Fetch course data  
        const courseResponse = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!courseResponse.ok) {
          throw new Error('Failed to fetch course data');
        }
        
        const courseData = await courseResponse.json();
        setCourse(courseData);
        
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    if (courseId && projectId) {
      fetchInitialData();
    }
  }, [courseId, projectId]);

  useEffect(() => {
    if (project && project.id) {
      fetchGroupsData();
    }
  }, [project?.id]);

  // Show loading state
  if (loading && !project) {
    return (
      <div className="simplified-grading-dashboard">
        <div className="dashboard-header">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Back to Projects
          </button>
          <h2>Loading...</h2>
        </div>
        <div className="loading-message">
          <p>Loading project data...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !project) {
    return (
      <div className="simplified-grading-dashboard">
        <div className="dashboard-header">
          <button onClick={onBack} className="back-button">
            <ArrowLeft size={20} />
            Back to Projects
          </button>
          <h2>Project not found</h2>
        </div>
        <div className="error-message">
          <AlertCircle size={48} />
          <p>{error || 'The selected project could not be found. Please go back and try again.'}</p>
        </div>
      </div>
    );
  }

  const fetchGroupsData = async () => {
    try {
      setLoading(true);
      
      if (!project || !project.id) {
        throw new Error('Project not found');
      }
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/projects/${project.id}/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch groups data');
      
      const data = await response.json();
      setGroupsData(data.groups);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    try {
      if (!project || !project.id) {
        throw new Error('Project not found');
      }
      
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_BASE_URL}/groups/${groupId}/project/${project.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch group details');
      
      const data = await response.json();
      return data;
    } catch (err) {
      console.error('Error fetching group details:', err);
      throw err;
    }
  };

  const handleGroupSelect = async (group) => {
    if (selectedGroup?.id === group.id) return;
    
    setSelectedGroup(group);
    setGroupDetails(null);
    
    try {
      const details = await fetchGroupDetails(group.id);
      setGroupDetails(details);
    } catch (err) {
      setError(`Failed to load group details: ${err.message}`);
    }
  };

  const downloadFile = async (fileUrl, fileName) => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file');
    }
  };

  const handleGradeSubmission = async (submissionId, gradeData, submissionType) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = submissionType === 'project' ? 
        `/api/grading-clean/project-submissions/${submissionId}/grade` :
        `/api/grading-clean/phase-submissions/${submissionId}/grade`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gradeData)
      });

      if (!response.ok) throw new Error('Failed to submit grade');
      
      // Refresh group details
      const details = await fetchGroupDetails(selectedGroup.id);
      setGroupDetails(details);
    } catch (err) {
      console.error('Error submitting grade:', err);
      alert('Failed to submit grade');
    }
  };

  if (!project) {
    return (
      <div className="simplified-grading-dashboard">
        <div className="loading-spinner">Project not found...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="simplified-grading-dashboard">
        <div className="loading-spinner">Loading grading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="simplified-grading-dashboard">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="simplified-grading-dashboard">
      <div className="dashboard-header">
        <button onClick={onBack} className="back-button">
          <ArrowLeft size={16} />
          Back
        </button>
        <h2>Grading: {project.title}</h2>
      </div>

      <div className="dashboard-content">
        <div className="groups-sidebar">
          <div className="sidebar-header">
            <h3>Groups ({groupsData.length})</h3>
          </div>
          <div className="groups-list">
            {groupsData.map(group => (
              <div 
                key={group.id}
                className={`group-card ${selectedGroup?.id === group.id ? 'selected' : ''}`}
                onClick={() => handleGroupSelect(group)}
              >
                <div className="group-card-content">
                  <h4>{group.name}</h4>
                  <div className="group-stats">
                    <div className="stat-item">
                      <FileText size={12} />
                      <span className="stat-number">{group.phaseSubmissions || 0}</span>
                      <span>phases</span>
                    </div>
                    <div className="stat-item">
                      <Clock size={12} />
                      <span className="stat-number">{group.hasProjectSubmission ? 1 : 0}</span>
                      <span>project</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="details-panel">
          <div className="panel-header">
            <h3>{selectedGroup ? selectedGroup.name : 'Select a Group'}</h3>
          </div>
          <div className="panel-content">
            {!selectedGroup ? (
              <div className="empty-panel">
                <User size={48} className="empty-icon" />
                <p>Select a group from the left to view submissions and grades</p>
              </div>
            ) : !groupDetails ? (
              <div className="loading-spinner">Loading group details...</div>
            ) : (
              <GroupDetailsPanel 
                groupDetails={groupDetails}
                onGrade={handleGradeSubmission}
                downloadFile={downloadFile}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Group Details Panel Component
const GroupDetailsPanel = ({ groupDetails, onGrade, downloadFile }) => {
  const [individualGrading, setIndividualGrading] = useState(false);

  return (
    <div className="group-details">
      {/* Group Members */}
      <div className="submission-detail">
        <div className="submission-header-row">
          <h4>👥 Group Members</h4>
        </div>
        <div className="submission-info">
          {groupDetails.group?.members?.map(member => (
            <p key={member.student_id}>
              <strong>{member.student.first_name} {member.student.last_name}</strong> - {member.role}
            </p>
          ))}
        </div>
      </div>

      {/* Project Submission */}
      {groupDetails.projectSubmission && (
        <ProjectSubmissionDetail 
          submission={groupDetails.projectSubmission}
          onGrade={onGrade}
          downloadFile={downloadFile}
          individualGrading={individualGrading}
          setIndividualGrading={setIndividualGrading}
          groupMembers={groupDetails.group?.members || []}
        />
      )}

      {/* Phase Submissions */}
      {groupDetails.phaseSubmissions?.map(phaseSubmission => (
        <PhaseSubmissionDetail 
          key={phaseSubmission.id}
          submission={phaseSubmission}
          onGrade={onGrade}
          downloadFile={downloadFile}
        />
      ))}

      {/* Frozen Task Submissions */}
      <FrozenTaskSubmissionsSection 
        frozenTasks={groupDetails.taskSubmissions || []}
        downloadFile={downloadFile}
        gradingMode={individualGrading}
      />
    </div>
  );
};

// Project Submission Detail Component
const ProjectSubmissionDetail = ({ submission, onGrade, downloadFile, individualGrading, setIndividualGrading, groupMembers }) => {
  const [gradeData, setGradeData] = useState({
    grade: submission.grade || '',
    feedback: submission.feedback || '',
    individualGrades: []
  });
  const [showGradeForm, setShowGradeForm] = useState(false);

  const handleSubmit = () => {
    onGrade(submission.id, gradeData, 'project');
    setShowGradeForm(false);
  };

  const files = submission.file_urls ? 
    (Array.isArray(submission.file_urls) ? submission.file_urls : JSON.parse(submission.file_urls || '[]')) : [];

  return (
    <div className="submission-detail">
      <div className="submission-header-row">
        <h4>📋 Final Project Submission</h4>
        <div className="action-buttons">
          {!showGradeForm && (
            <button 
              onClick={() => setShowGradeForm(true)}
              className="btn primary"
            >
              Edit Grade
            </button>
          )}
        </div>
      </div>

      <div className="submission-info">
        <p><strong>Submitted:</strong> {new Date(submission.submitted_at).toLocaleDateString()}</p>
        <p><strong>By:</strong> {submission.submitted_by_student?.first_name} {submission.submitted_by_student?.last_name}</p>
        <p><strong>Status:</strong> <span className={`status-badge ${submission.status}`}>{submission.status}</span></p>
      </div>

      {/* Always show current grade */}
      <div className={`grade-display ${!submission.grade ? 'no-grade' : ''}`}>
        <strong>Current Grade:</strong> {submission.grade ? `${submission.grade}/100` : 'No grade assigned'}
        {submission.feedback && (
          <div><strong>Feedback:</strong> {submission.feedback}</div>
        )}
      </div>

      {submission.submission_text && (
        <div className="submission-content">
          <h5>Content:</h5>
          <p>{submission.submission_text}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="submission-files">
          <h5>Files ({files.length}):</h5>
          <div className="files-list">
            {files.map((fileUrl, index) => {
              const fileName = fileUrl.split('/').pop() || `file_${index + 1}`;
              return (
                <div key={index} className="file-item">
                  <span className="file-name">{fileName}</span>
                  <div className="file-actions">
                    <button 
                      onClick={() => downloadFile(fileUrl, fileName)}
                      className="btn small primary"
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showGradeForm && (
        <div className="grade-form">
          {/* Individual Grading Toggle */}
          <div className="individual-grading-toggle">
            <label>
              <input 
                type="checkbox"
                checked={individualGrading}
                onChange={(e) => setIndividualGrading(e.target.checked)}
              />
              Enable Individual Grading
            </label>
            
            {individualGrading && (
              <div className="individual-grades">
                {groupMembers.map(member => (
                  <div key={member.student_id} className="member-grade-item">
                    <label>{member.student.first_name} {member.student.last_name}:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Grade"
                      onChange={(e) => {
                        const individualGrades = [...gradeData.individualGrades];
                        const existingIndex = individualGrades.findIndex(g => g.studentId === member.student_id);
                        if (existingIndex >= 0) {
                          individualGrades[existingIndex].grade = e.target.value;
                        } else {
                          individualGrades.push({ studentId: member.student_id, grade: e.target.value });
                        }
                        setGradeData(prev => ({...prev, individualGrades}));
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Overall Grade (0-100):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={gradeData.grade}
                onChange={(e) => setGradeData(prev => ({...prev, grade: e.target.value}))}
              />
            </div>
            <div className="form-group">
              <label>Feedback:</label>
              <textarea
                value={gradeData.feedback}
                onChange={(e) => setGradeData(prev => ({...prev, feedback: e.target.value}))}
                rows="3"
              />
            </div>
          </div>
          <div className="form-row">
            <button onClick={handleSubmit} className="btn primary">
              Submit Grade
            </button>
            <button onClick={() => setShowGradeForm(false)} className="btn secondary">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Phase Submission Detail Component
const PhaseSubmissionDetail = ({ submission, onGrade, downloadFile }) => {
  const [gradeData, setGradeData] = useState({
    grade: submission.grade || '',
    feedback: submission.feedback || ''
  });
  const [showGradeForm, setShowGradeForm] = useState(false);

  const handleSubmit = () => {
    onGrade(submission.id, gradeData, 'phase');
    setShowGradeForm(false);
  };

  const files = submission.file_urls ? 
    (Array.isArray(submission.file_urls) ? submission.file_urls : JSON.parse(submission.file_urls || '[]')) : [];

  // Check if phase has grade
  const hasGrade = submission.grade != null;

  return (
    <div className="submission-detail">
      <div className="submission-header-row">
        <h5>Phase {submission.phase.phase_number}: {submission.phase.title}</h5>
        <div className="action-buttons">
          <button 
            onClick={() => setShowGradeForm(!showGradeForm)}
            className="btn small primary"
          >
            {showGradeForm ? 'Cancel' : 'Edit Grade'}
          </button>
        </div>
      </div>

      <div className="submission-info">
        <p><strong>Submitted:</strong> {new Date(submission.created_at).toLocaleDateString()}</p>
        <p><strong>Status:</strong> <span className={`status-badge ${submission.status}`}>{submission.status}</span></p>
      </div>

      {/* Always show current grade */}
      <div className={`grade-display ${!hasGrade ? 'no-grade' : ''}`}>
        <strong>Current Grade:</strong> {hasGrade ? `${submission.grade}/100` : 'No grade assigned'}
        {submission.feedback && (
          <div><strong>Feedback:</strong> {submission.feedback}</div>
        )}
      </div>

      {submission.submission_text && (
        <div className="submission-content">
          <h6>Content:</h6>
          <p>{submission.submission_text}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="submission-files">
          <h6>Files ({files.length}):</h6>
          <div className="files-list">
            {files.map((fileUrl, index) => {
              const fileName = fileUrl.split('/').pop() || `file_${index + 1}`;
              return (
                <div key={index} className="file-item">
                  <span className="file-name">{fileName}</span>
                  <div className="file-actions">
                    <button 
                      onClick={() => downloadFile(fileUrl, fileName)}
                      className="btn small primary"
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showGradeForm && (
        <div className="grade-form">
          <div className="form-row">
            <input
              type="number"
              min="0"
              max="100"
              value={gradeData.grade}
              onChange={(e) => setGradeData(prev => ({...prev, grade: e.target.value}))}
              placeholder="Grade (0-100)"
            />
            <input
              type="text"
              value={gradeData.feedback}
              onChange={(e) => setGradeData(prev => ({...prev, feedback: e.target.value}))}
              placeholder="Feedback"
            />
            <button onClick={handleSubmit} className="btn small primary">
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Task Submission Detail Component (Frozen Tasks)
const TaskSubmissionDetail = ({ submission, downloadFile }) => {
  const files = submission.file_urls ? 
    (Array.isArray(submission.file_urls) ? submission.file_urls : JSON.parse(submission.file_urls || '[]')) : [];

  return (
    <div className="submission-detail">
      <div className="submission-header-row">
        <h5>🔒 {submission.task_title} (Frozen)</h5>
      </div>

      <div className="submission-info">
        <p><strong>Assigned to:</strong> {submission.submitted_by_student?.first_name} {submission.submitted_by_student?.last_name}</p>
        <p><strong>Phase:</strong> {submission.phase?.title}</p>
        <p><strong>Status:</strong> <span className={`status-badge ${submission.status}`}>{submission.status}</span></p>
        <p><strong>Frozen at:</strong> {new Date(submission.frozen_at).toLocaleDateString()}</p>
      </div>

      {submission.task_description && (
        <div className="submission-content">
          <h6>Task Description:</h6>
          <p>{submission.task_description}</p>
        </div>
      )}

      {submission.submission_text && (
        <div className="submission-content">
          <h6>Submission:</h6>
          <p>{submission.submission_text}</p>
        </div>
      )}

      {files.length > 0 && (
        <div className="submission-files">
          <h6>Files ({files.length}):</h6>
          <div className="files-list">
            {files.map((fileUrl, index) => {
              const fileName = fileUrl.split('/').pop() || `file_${index + 1}`;
              return (
                <div key={index} className="file-item">
                  <span className="file-name">{fileName}</span>
                  <div className="file-actions">
                    <button 
                      onClick={() => downloadFile(fileUrl, fileName)}
                      className="btn small primary"
                      title="Download"
                    >
                      <Download size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Frozen Task Submissions Section Component
const FrozenTaskSubmissionsSection = ({ frozenTasks = [], downloadFile, gradingMode = false }) => {
  const [expandedPhases, setExpandedPhases] = useState(new Set());

  // Group frozen tasks by phase
  const tasksByPhase = frozenTasks.reduce((acc, task) => {
    const phaseTitle = task.phase?.title || 'No Phase';
    if (!acc[phaseTitle]) {
      acc[phaseTitle] = [];
    }
    acc[phaseTitle].push(task);
    return acc;
  }, {});

  const togglePhaseExpansion = (phaseTitle) => {
    const newExpanded = new Set(expandedPhases);
    if (newExpanded.has(phaseTitle)) {
      newExpanded.delete(phaseTitle);
    } else {
      newExpanded.add(phaseTitle);
    }
    setExpandedPhases(newExpanded);
  };

  if (frozenTasks.length === 0) {
    return (
      <div className="submission-detail">
        <div className="submission-header-row">
          <h5>🔒 Frozen Task Submissions</h5>
        </div>
        <div className="no-submission">
          <p>No frozen task submissions available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="submission-detail">
      <div className="submission-header-row">
        <h5>🔒 Frozen Task Submissions ({frozenTasks.length})</h5>
      </div>

      {Object.entries(tasksByPhase).map(([phaseTitle, phaseTasks]) => {
        const isExpanded = expandedPhases.has(phaseTitle);
        
        return (
          <div key={phaseTitle} className="phase-section">
            <div 
              className="phase-header clickable"
              onClick={() => togglePhaseExpansion(phaseTitle)}
            >
              <div className="phase-title">
                <span className="phase-icon">{isExpanded ? '📂' : '📁'}</span>
                <strong>{phaseTitle}</strong>
                <span className="task-count">({phaseTasks.length} tasks)</span>
              </div>
              <ChevronDown 
                size={16} 
                className={`expand-icon ${isExpanded ? 'expanded' : ''}`} 
              />
            </div>

            {isExpanded && (
              <div className="phase-tasks">
                {phaseTasks.map((task, index) => (
                  <div key={index} className="frozen-task-item">
                    <div className="task-info">
                      <div className="task-header">
                        <h6>{task.task_title}</h6>
                        <span className={`status-badge ${task.status}`}>
                          {task.status}
                        </span>
                      </div>
                      
                      <div className="task-meta">
                        <p><strong>Assigned to:</strong> {task.submitted_by_student?.first_name} {task.submitted_by_student?.last_name}</p>
                        <p><strong>Frozen at:</strong> {new Date(task.frozen_at).toLocaleDateString()}</p>
                        {task.submission_date && (
                          <p><strong>Submitted:</strong> {new Date(task.submission_date).toLocaleDateString()}</p>
                        )}
                      </div>

                      {task.task_description && (
                        <div className="task-description">
                          <p><strong>Description:</strong> {task.task_description}</p>
                        </div>
                      )}

                      {task.submission_text && (
                        <div className="submission-content">
                          <p><strong>Submission:</strong> {task.submission_text}</p>
                        </div>
                      )}

                      {/* File Downloads */}
                      {task.file_urls && (
                        <div className="submission-files">
                          <p><strong>Files:</strong></p>
                          <div className="files-list">
                            {(() => {
                              const files = Array.isArray(task.file_urls) 
                                ? task.file_urls 
                                : JSON.parse(task.file_urls || '[]');
                              
                              return files.map((fileUrl, fileIndex) => {
                                const fileName = fileUrl.split('/').pop() || `file_${fileIndex + 1}`;
                                return (
                                  <div key={fileIndex} className="file-item">
                                    <span className="file-name">{fileName}</span>
                                    <button 
                                      onClick={() => downloadFile(fileUrl, fileName)}
                                      className="btn small primary"
                                      title="Download"
                                    >
                                      <Download size={12} />
                                    </button>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}

                      {gradingMode && (
                        <div className="grading-actions">
                          <button className="btn small primary">
                            Grade Task
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SimplifiedGradingDashboard;