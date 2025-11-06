import React, { useState, useEffect } from 'react';
import { apiConfig } from '../config/api';
import './NewProjectGradingDashboard.css';

const NewProjectGradingDashboard = ({ selectedProject, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (selectedProject) {
      fetchGroupsWithSubmissions();
    }
  }, [selectedProject]);

  const fetchGroupsWithSubmissions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiConfig.baseURL}/api/grading-clean/projects/${selectedProject.id}/groups`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch groups with submissions');
      }

      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiConfig.baseURL}/api/grading-clean/groups/${groupId}/project/${selectedProject.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch group details');
      }

      const data = await response.json();
      setGroupDetails(data);
      setSelectedGroup(groupId);
    } catch (error) {
      console.error('Error fetching group details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGradeProjectSubmission = async (submissionId, gradeData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiConfig.baseURL}/api/grading/project-submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gradeData)
      });

      if (!response.ok) {
        throw new Error('Failed to grade submission');
      }

      // Refresh the group details
      fetchGroupDetails(selectedGroup);
    } catch (error) {
      console.error('Error grading submission:', error);
      setError(error.message);
    }
  };

  const handleGradePhaseSubmission = async (submissionId, gradeData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiConfig.baseURL}/api/grading/phase-submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gradeData)
      });

      if (!response.ok) {
        throw new Error('Failed to grade phase submission');
      }

      // Refresh the group details
      fetchGroupDetails(selectedGroup);
    } catch (error) {
      console.error('Error grading phase submission:', error);
      setError(error.message);
    }
  };

  const handleGradeTaskSubmission = async (submissionId, gradeData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiConfig.baseURL}/api/grading/task-submissions/${submissionId}/grade`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gradeData)
      });

      if (!response.ok) {
        throw new Error('Failed to grade task submission');
      }

      // Refresh the group details
      fetchGroupDetails(selectedGroup);
    } catch (error) {
      console.error('Error grading task submission:', error);
      setError(error.message);
    }
  };

  const downloadFile = (fileUrl, fileName) => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="grading-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grading-dashboard">
        <div className="error-container">
          <h3>Error</h3>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grading-dashboard">
      <div className="dashboard-header">
        <div className="header-content">
          <h2>Grade Project: {selectedProject?.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        {selectedGroup && (
          <button 
            className="back-btn" 
            onClick={() => {
              setSelectedGroup(null);
              setGroupDetails(null);
            }}
          >
            ← Back to Groups
          </button>
        )}
      </div>

      {!selectedGroup ? (
        // Groups List View
        <div className="groups-list">
          <h3>Groups with Submissions ({groups.length})</h3>
          {groups.length === 0 ? (
            <div className="no-submissions">
              <p>No groups have submitted for this project yet.</p>
            </div>
          ) : (
            <div className="groups-grid">
              {groups.map((submission) => (
                <div key={submission.id} className="group-card" onClick={() => fetchGroupDetails(submission.group.id)}>
                  <div className="group-header">
                    <h4>{submission.group.group_name || `Group ${submission.group.group_number}`}</h4>
                    <span className={`status-badge ${submission.status}`}>
                      {submission.status}
                    </span>
                  </div>
                  
                  <div className="group-info">
                    <div className="members-count">
                      <span>👥 {submission.group.members?.length || 0} members</span>
                    </div>
                    
                    <div className="submission-info">
                      <p><strong>Submitted:</strong> {formatDate(submission.submission_date)}</p>
                      <p><strong>By:</strong> {submission.submitted_by_student ? `${submission.submitted_by_student.first_name} ${submission.submitted_by_student.last_name}` : 'Unknown Student'}</p>
                    </div>
                  </div>

                  <div className="group-members">
                    {submission.group.members?.slice(0, 3).map((member, index) => (
                      <span key={index} className="member-pill">
                        {member.student ? `${member.student.first_name} ${member.student.last_name}` : 'Unknown Student'}
                        {member.role === 'leader' && ' (Leader)'}
                      </span>
                    ))}
                    {submission.group.members?.length > 3 && (
                      <span className="member-pill more">
                        +{submission.group.members.length - 3} more
                      </span>
                    )}
                  </div>

                  <div className="card-footer">
                    <span className="click-hint">Click to grade →</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Group Details View
        <div className="group-details">
          {groupDetails && (
            <>
              <div className="group-info-header">
                <h3>{groupDetails.group.group_name || `Group ${groupDetails.group.group_number}`}</h3>
                <div className="group-members-detailed">
                  {groupDetails.group.members?.map((member, index) => (
                    <span key={index} className={`member-badge ${member.role}`}>
                      {member.student ? `${member.student.first_name} ${member.student.last_name}` : 'Unknown Student'}
                      {member.role === 'leader' && ' 👑'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Project Submission */}
              <div className="submission-section">
                <h4>📋 Project Submission</h4>
                {groupDetails.projectSubmission ? (
                  <ProjectSubmissionCard 
                    submission={groupDetails.projectSubmission}
                    onGrade={handleGradeProjectSubmission}
                    onDownload={downloadFile}
                    members={groupDetails.group.members}
                  />
                ) : (
                  <p>No project submission found.</p>
                )}
              </div>

              {/* Phase Submissions */}
              <div className="submission-section">
                <h4>📊 Phase Submissions ({groupDetails.phaseSubmissions?.length || 0})</h4>
                {groupDetails.phaseSubmissions?.length > 0 ? (
                  <div className="phases-list">
                    {groupDetails.phaseSubmissions.map((phaseSubmission) => (
                      <PhaseSubmissionCard 
                        key={phaseSubmission.id}
                        submission={phaseSubmission}
                        onGrade={handleGradePhaseSubmission}
                        onDownload={downloadFile}
                        members={groupDetails.group.members}
                        taskSubmissions={groupDetails.taskSubmissions?.filter(
                          task => task.phase.id === phaseSubmission.phase.id
                        ) || []}
                        onGradeTask={handleGradeTaskSubmission}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="no-phase-submissions">
                    <p>No phase submissions found, but here are the individual task submissions that were frozen when the leader submitted the project:</p>
                    
                    {/* Show frozen task submissions grouped by phase */}
                    {groupDetails.taskSubmissions?.length > 0 && (
                      <div className="frozen-tasks-overview">
                        <h5>🧊 Frozen Task Submissions from Project Completion</h5>
                        {/* Group tasks by phase */}
                        {[...new Set(groupDetails.taskSubmissions.map(task => task.phase.id))]
                          .map(phaseId => {
                            const phaseTasks = groupDetails.taskSubmissions.filter(task => task.phase.id === phaseId);
                            const phase = phaseTasks[0]?.phase;
                            
                            return (
                              <div key={phaseId} className="phase-task-group">
                                <h6>Phase {phase.phase_number}: {phase.title} ({phaseTasks.length} tasks)</h6>
                                <div className="task-submissions-list">
                                  {phaseTasks.map((taskSubmission) => (
                                    <TaskSubmissionCard 
                                      key={taskSubmission.id}
                                      submission={taskSubmission}
                                      onGrade={handleGradeTaskSubmission}
                                      onDownload={downloadFile}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })
                        }
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const ProjectSubmissionCard = ({ submission, onGrade, onDownload, members }) => {
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [gradeData, setGradeData] = useState({
    grade: submission.grade || '',
    feedback: submission.feedback || '',
    individualGrades: []
  });

  const handleGradeSubmit = () => {
    onGrade(submission.id, gradeData);
    setShowGradeForm(false);
  };

  return (
    <div className="submission-card project-submission">
      <div className="submission-header">
        <h5>Final Project Submission</h5>
        <span className={`status-badge ${submission.status}`}>
          {submission.status}
        </span>
      </div>

      <div className="submission-details">
        <p><strong>Submitted:</strong> {new Date(submission.submission_date).toLocaleDateString()}</p>
        <p><strong>By:</strong> {submission.submitted_by_student ? `${submission.submitted_by_student.first_name} ${submission.submitted_by_student.last_name}` : 'Unknown Student'}</p>
        
        {submission.grade && (
          <div className="current-grade">
            <strong>Grade:</strong> {submission.grade}/100
          </div>
        )}
      </div>

      {(submission.file_urls || submission.file_url) && (
        <div className="file-section">
          <h6>📎 Submitted Files:</h6>
          {(() => {
            // Handle both file_urls (array) and file_url (single)
            let fileUrls = [];
            if (submission.file_urls) {
              fileUrls = Array.isArray(submission.file_urls) ? submission.file_urls : JSON.parse(submission.file_urls || '[]');
            } else if (submission.file_url) {
              fileUrls = [submission.file_url];
            }
            
            return fileUrls.map((fileUrl, index) => {
              const fileName = fileUrl.split('/').pop().split('%20').join(' ') || `file-${index + 1}`;
              return (
                <div key={index} className="file-item">
                  <button 
                    className="download-btn"
                    onClick={() => onDownload(fileUrl, fileName)}
                  >
                    📄 {fileName}
                  </button>
                </div>
              );
            });
          })()}
        </div>
      )}

      <div className="grade-section">
        {!showGradeForm ? (
          <button 
            className="grade-btn primary"
            onClick={() => setShowGradeForm(true)}
          >
            {submission.grade ? 'Update Grade' : 'Grade Submission'}
          </button>
        ) : (
          <div className="grade-form">
            <div className="form-group">
              <label>Project Grade (0-100):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={gradeData.grade}
                onChange={(e) => setGradeData({...gradeData, grade: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Feedback:</label>
              <textarea
                value={gradeData.feedback}
                onChange={(e) => setGradeData({...gradeData, feedback: e.target.value})}
                placeholder="Provide feedback for the group..."
              />
            </div>

            <div className="individual-grades">
              <h6>Individual Grade Overrides (Optional):</h6>
              {members?.map((member) => (
                <div key={member.id} className="individual-grade-row">
                  <span>{member.student ? `${member.student.first_name} ${member.student.last_name}` : 'Unknown Student'}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Same as group"
                    onChange={(e) => {
                      const newGrades = gradeData.individualGrades.filter(g => g.studentId !== member.student.id);
                      if (e.target.value) {
                        newGrades.push({
                          studentId: member.student.id,
                          grade: e.target.value,
                          feedback: ''
                        });
                      }
                      setGradeData({...gradeData, individualGrades: newGrades});
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button className="btn secondary" onClick={() => setShowGradeForm(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleGradeSubmit}>
                Submit Grade
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PhaseSubmissionCard = ({ submission, onGrade, onDownload, members, taskSubmissions, onGradeTask }) => {
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [gradeData, setGradeData] = useState({
    grade: submission.grade || '',
    feedback: submission.feedback || '',
    individualGrades: []
  });
  const [expandedTasks, setExpandedTasks] = useState(false);

  const handleGradeSubmit = () => {
    onGrade(submission.id, gradeData);
    setShowGradeForm(false);
  };

  return (
    <div className="submission-card phase-submission">
      <div className="submission-header">
        <h6>Phase {submission.phase.phase_number}: {submission.phase.title}</h6>
        <div className="header-actions">
          <span className={`status-badge ${submission.status}`}>
            {submission.status}
          </span>
          {taskSubmissions.length > 0 && (
            <button 
              className="toggle-tasks-btn"
              onClick={() => setExpandedTasks(!expandedTasks)}
            >
              {expandedTasks ? '▲' : '▼'} Tasks ({taskSubmissions.length})
            </button>
          )}
        </div>
      </div>

      <div className="submission-details">
        <p><strong>Submitted:</strong> {new Date(submission.submission_date).toLocaleDateString()}</p>
        <p><strong>By:</strong> {submission.submitted_by_student ? `${submission.submitted_by_student.first_name} ${submission.submitted_by_student.last_name}` : 'Unknown Student'}</p>
        
        {submission.grade && (
          <div className="current-grade">
            <strong>Grade:</strong> {submission.grade}/100
          </div>
        )}

        {submission.description && (
          <p><strong>Description:</strong> {submission.description}</p>
        )}
      </div>

      {submission.file_url && (
        <div className="file-section">
          <button 
            className="download-btn"
            onClick={() => onDownload(submission.file_url, submission.file_name || 'phase-submission.zip')}
          >
            📎 Download Phase Submission
          </button>
        </div>
      )}

      <div className="grade-section">
        {!showGradeForm ? (
          <button 
            className="grade-btn primary"
            onClick={() => setShowGradeForm(true)}
          >
            {submission.grade ? 'Update Grade' : 'Grade Phase'}
          </button>
        ) : (
          <div className="grade-form">
            <div className="form-group">
              <label>Phase Grade (0-100):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={gradeData.grade}
                onChange={(e) => setGradeData({...gradeData, grade: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Feedback:</label>
              <textarea
                value={gradeData.feedback}
                onChange={(e) => setGradeData({...gradeData, feedback: e.target.value})}
                placeholder="Provide feedback for the phase..."
              />
            </div>

            <div className="individual-grades">
              <h6>Individual Grade Overrides (Optional):</h6>
              {members?.map((member) => (
                <div key={member.id} className="individual-grade-row">
                  <span>{member.student ? `${member.student.first_name} ${member.student.last_name}` : 'Unknown Student'}</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Same as group"
                    onChange={(e) => {
                      const newGrades = gradeData.individualGrades.filter(g => g.studentId !== member.student.id);
                      if (e.target.value) {
                        newGrades.push({
                          studentId: member.student.id,
                          grade: e.target.value,
                          feedback: ''
                        });
                      }
                      setGradeData({...gradeData, individualGrades: newGrades});
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="form-actions">
              <button className="btn secondary" onClick={() => setShowGradeForm(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleGradeSubmit}>
                Submit Grade
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Task Submissions */}
      {expandedTasks && taskSubmissions.length > 0 && (
        <div className="task-submissions-section">
          <h6>📝 Task Submissions ({taskSubmissions.length})</h6>
          <div className="task-submissions-list">
            {taskSubmissions.map((taskSubmission) => (
              <TaskSubmissionCard 
                key={taskSubmission.id}
                submission={taskSubmission}
                onGrade={onGradeTask}
                onDownload={onDownload}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TaskSubmissionCard = ({ submission, onGrade, onDownload }) => {
  const [showGradeForm, setShowGradeForm] = useState(false);
  const [gradeData, setGradeData] = useState({
    grade: submission.grade || '',
    feedback: submission.feedback || ''
  });

  const handleGradeSubmit = () => {
    onGrade(submission.id, gradeData);
    setShowGradeForm(false);
  };

  return (
    <div className="submission-card task-submission">
      <div className="submission-header">
        <h6>📋 {submission.task?.title || submission.task_title || 'Unknown Task'}</h6>
        <span className={`status-badge ${submission.status}`}>
          {submission.status}
        </span>
      </div>

      <div className="submission-details">
        <p><strong>Task Type:</strong> {submission.task?.task_type || 'Task'}</p>
        <p><strong>Submitted:</strong> {new Date(submission.submitted_at || submission.submission_date).toLocaleDateString()}</p>
        <p><strong>By:</strong> {submission.submitted_by_student ? `${submission.submitted_by_student.first_name} ${submission.submitted_by_student.last_name}` : 'Unknown Student'}</p>
        
        {submission.is_frozen && (
          <div className="frozen-indicator">
            <span className="frozen-badge">🧊 Frozen Submission</span>
            <p><strong>Frozen on:</strong> {new Date(submission.frozen_at).toLocaleDateString()}</p>
          </div>
        )}
        
        {submission.task?.due_date && (
          <p><strong>Due:</strong> {new Date(submission.task.due_date).toLocaleDateString()}</p>
        )}
        
        {submission.grade && (
          <div className="current-grade">
            <strong>Grade:</strong> {submission.grade}/100
          </div>
        )}

        {submission.task.description && (
          <p><strong>Task Description:</strong> {submission.task.description}</p>
        )}
        
        {submission.submission_text && (
          <div className="submission-content">
            <p><strong>Submission Text:</strong></p>
            <div className="text-content">
              {submission.submission_text}
            </div>
          </div>
        )}
      </div>

      {/* Handle both frozen (file_urls array) and live (file_url string) submissions */}
      {((submission.file_urls && JSON.parse(submission.file_urls || '[]').length > 0) || submission.file_url) && (
        <div className="file-section">
          <h6>📎 Submitted Files:</h6>
          {submission.file_urls ? (
            // Frozen submissions - multiple files in array
            JSON.parse(submission.file_urls || '[]').map((fileUrl, index) => (
              <button 
                key={index}
                className="download-btn"
                onClick={() => {
                  const fileName = fileUrl.split('/').pop() || `file-${index + 1}`;
                  onDownload(fileUrl, fileName);
                }}
              >
                📎 Download File {index + 1}
              </button>
            ))
          ) : (
            // Live submissions - single file
            <button 
              className="download-btn"
              onClick={() => onDownload(submission.file_url, submission.file_name || 'task-submission.zip')}
            >
              📎 Download Task Submission
            </button>
          )}
        </div>
      )}

      <div className="grade-section">
        {!showGradeForm ? (
          <button 
            className="grade-btn secondary"
            onClick={() => setShowGradeForm(true)}
          >
            {submission.grade ? 'Update Task Grade' : 'Grade Task'}
          </button>
        ) : (
          <div className="grade-form compact">
            <div className="form-group">
              <label>Task Grade (0-100):</label>
              <input
                type="number"
                min="0"
                max="100"
                value={gradeData.grade}
                onChange={(e) => setGradeData({...gradeData, grade: e.target.value})}
              />
            </div>

            <div className="form-group">
              <label>Feedback:</label>
              <textarea
                value={gradeData.feedback}
                onChange={(e) => setGradeData({...gradeData, feedback: e.target.value})}
                placeholder="Provide feedback for the task..."
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button className="btn secondary" onClick={() => setShowGradeForm(false)}>
                Cancel
              </button>
              <button className="btn primary" onClick={handleGradeSubmit}>
                Grade Task
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewProjectGradingDashboard;