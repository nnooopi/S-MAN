import React, { useState, useEffect } from 'react';
import {
  FaGraduationCap, FaUsers, FaTasks, FaDownload, FaSave, FaCheck, FaTimes,
  FaEye, FaEdit, FaStar, FaFileAlt, FaChevronDown, FaChevronUp, FaUser,
  FaToggleOn, FaToggleOff, FaClock, FaExclamationTriangle
} from 'react-icons/fa';
import { apiConfig } from '../config/api';

// Main Project Grading Dashboard Component
const ProjectGradingDashboard = ({ courseId, projectId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [projectSubmissions, setProjectSubmissions] = useState([]);
  const [phaseSubmissions, setPhaseSubmissions] = useState([]);
  const [taskSubmissions, setTaskSubmissions] = useState([]);
  const [selectedPhase, setSelectedPhase] = useState(null);
  const [expandedSubmissions, setExpandedSubmissions] = useState(new Set());

  useEffect(() => {
    fetchGradingData();
  }, [projectId]);

  const fetchGradingData = async () => {
    try {
      setLoading(true);
      
      // Fetch project submissions
      const projectResponse = await fetch(
        `${apiConfig.baseURL}/api/professor-grading/projects/${projectId}/submissions`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProject(projectData.project);
        setProjectSubmissions(projectData.submissions);
        
        // Fetch project phases separately
        const phasesResponse = await fetch(
          `${apiConfig.baseURL}/api/professor/projects/${projectId}/phases`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          }
        );
        
        if (phasesResponse.ok) {
          const phasesData = await phasesResponse.json();
          if (phasesData.length > 0) {
            const updatedProject = { ...projectData.project, phases: phasesData };
            setProject(updatedProject);
            
            // Set first phase as default
            setSelectedPhase(phasesData[0]);
            await fetchPhaseSubmissions(phasesData[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching grading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhaseSubmissions = async (phaseId) => {
    try {
      const response = await fetch(
        `${apiConfig.baseURL}/api/professor-grading/projects/${projectId}/phases/${phaseId}/submissions`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setPhaseSubmissions(data.submissions);
        setTaskSubmissions(data.taskSubmissions);
      }
    } catch (error) {
      console.error('Error fetching phase submissions:', error);
    }
  };

  const downloadFile = async (filePath, fileName) => {
    try {
      const response = await fetch(
        `${apiConfig.baseURL}/api/professor-grading/download-file?path=${encodeURIComponent(filePath)}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Error downloading file');
    }
  };

  const toggleSubmissionExpanded = (submissionId) => {
    const newExpanded = new Set(expandedSubmissions);
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId);
    } else {
      newExpanded.add(submissionId);
    }
    setExpandedSubmissions(newExpanded);
  };

  if (loading) {
    return (
      <div className="grading-dashboard loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading grading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grading-dashboard">
      {/* Header */}
      <div className="grading-header">
        <div className="header-left">
          <button className="back-button" onClick={onBack}>
            ← Back to Course
          </button>
          <h1>{project?.title || 'Project Grading'}</h1>
          <p className="project-info">
            Due: {project?.due_date ? new Date(project.due_date).toLocaleDateString() : 'No due date'}
          </p>
        </div>
      </div>

      {/* Main Grading Layout */}
      <div className="grading-layout">
        
        {/* Section 1: Project Submissions (Final Deliverable) */}
        <div className="grading-section project-submissions">
          <div className="section-header">
            <FaGraduationCap />
            <h2>Project Submissions (Final Deliverable)</h2>
            <span className="count">{projectSubmissions.length}</span>
          </div>
          
          <div className="submissions-list">
            {projectSubmissions.length === 0 ? (
              <div className="no-submissions">
                <FaExclamationTriangle />
                <p>No project submissions yet</p>
              </div>
            ) : (
              projectSubmissions.map(submission => (
                <ProjectSubmissionCard
                  key={submission.id}
                  submission={submission}
                  onDownload={downloadFile}
                  expanded={expandedSubmissions.has(submission.id)}
                  onToggleExpanded={() => toggleSubmissionExpanded(submission.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Section 2: Phase Submissions */}
        <div className="grading-section phase-submissions">
          <div className="section-header">
            <FaTasks />
            <h2>Phase Submissions</h2>
            
            {/* Phase Selector */}
            {project?.phases && project.phases.length > 0 && (
              <div className="phase-selector">
                <select 
                  value={selectedPhase?.id || ''}
                  onChange={(e) => {
                    const phase = project.phases.find(p => p.id === e.target.value);
                    setSelectedPhase(phase);
                    if (phase) fetchPhaseSubmissions(phase.id);
                  }}
                >
                  {project.phases.map((phase, index) => (
                    <option key={phase.id} value={phase.id}>
                      Phase {index + 1}: {phase.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {selectedPhase && (
            <div className="phase-content">
              {/* Phase Deliverable Submissions */}
              <div className="phase-deliverables">
                <h3>Phase {selectedPhase.phase_number} Deliverables</h3>
                <div className="submissions-list">
                  {phaseSubmissions.length === 0 ? (
                    <div className="no-submissions">
                      <FaExclamationTriangle />
                      <p>No phase submissions yet</p>
                    </div>
                  ) : (
                    phaseSubmissions.map(submission => (
                      <PhaseSubmissionCard
                        key={submission.id}
                        submission={submission}
                        taskSubmissions={taskSubmissions.filter(ts => ts.group_id === submission.group_id)}
                        onDownload={downloadFile}
                        expanded={expandedSubmissions.has(`phase-${submission.id}`)}
                        onToggleExpanded={() => toggleSubmissionExpanded(`phase-${submission.id}`)}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Project Submission Card Component
const ProjectSubmissionCard = ({ submission, onDownload, expanded, onToggleExpanded }) => {
  const [grading, setGrading] = useState(false);
  const [groupGrade, setGroupGrade] = useState(submission.grade || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');
  const [individualGrades, setIndividualGrades] = useState({});
  const [sameAsGroupGrade, setSameAsGroupGrade] = useState({});

  useEffect(() => {
    // Initialize individual grades
    const initialIndividualGrades = {};
    const initialSameAsGroup = {};
    
    submission.group?.members?.forEach(member => {
      const studentId = member.student.id;
      const existingGrade = submission.individual_grades?.find(ig => ig.student_id === studentId);
      initialIndividualGrades[studentId] = existingGrade?.grade || '';
      initialSameAsGroup[studentId] = !existingGrade; // If no individual grade exists, default to same as group
    });
    
    setIndividualGrades(initialIndividualGrades);
    setSameAsGroupGrade(initialSameAsGroup);
  }, [submission]);

  const handleGradeSubmission = async () => {
    try {
      setGrading(true);
      
      // Prepare individual grades data
      const individualGradesData = Object.entries(individualGrades)
        .filter(([studentId, grade]) => !sameAsGroupGrade[studentId] && grade !== '')
        .map(([studentId, grade]) => ({
          studentId,
          grade: parseFloat(grade),
          feedback: feedback // Could be individual feedback per student
        }));

      const response = await fetch(
        `${apiConfig.baseURL}/api/professor-grading/projects/${submission.project_id}/submissions/${submission.id}/grade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            groupGrade: parseFloat(groupGrade),
            individualGrades: individualGradesData,
            feedback: feedback
          })
        }
      );

      if (response.ok) {
        alert('Project submission graded successfully!');
        // Refresh data or update state
      } else {
        throw new Error('Failed to grade submission');
      }
    } catch (error) {
      console.error('Error grading submission:', error);
      alert('Error grading submission');
    } finally {
      setGrading(false);
    }
  };

  const parseFileUrls = (fileUrls) => {
    if (!fileUrls) return [];
    try {
      return Array.isArray(fileUrls) ? fileUrls : JSON.parse(fileUrls);
    } catch {
      return [];
    }
  };

  const files = parseFileUrls(submission.file_urls);

  return (
    <div className={`submission-card project-submission ${expanded ? 'expanded' : ''}`}>
      <div className="card-header" onClick={onToggleExpanded}>
        <div className="submission-info">
          <h4>{submission.group?.group_name || `Group ${submission.group?.group_number}`}</h4>
          <div className="submission-meta">
            <span className="date">
              <FaClock />
              {new Date(submission.submission_date).toLocaleDateString()}
            </span>
            <span className={`status ${submission.status}`}>
              {submission.grade ? `${submission.grade}%` : submission.status}
            </span>
          </div>
        </div>
        <div className="card-actions">
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>

      {expanded && (
        <div className="card-content">
          {/* Group Members */}
          <div className="group-members">
            <h5>Group Members</h5>
            <div className="members-list">
              {submission.group?.members?.map(member => (
                <div key={member.id} className="member-pill">
                  <img 
                    src={member.student.profile_picture_url || '/default-avatar.png'} 
                    alt={`${member.student.first_name} ${member.student.last_name}`}
                    className="member-avatar"
                  />
                  <span className="member-name">
                    {member.student.first_name} {member.student.last_name}
                  </span>
                  <span className={`member-role ${member.role}`}>
                    {member.role === 'leader' ? '👑' : '👤'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Files */}
          {files.length > 0 && (
            <div className="submission-files">
              <h5>Submitted Files</h5>
              <div className="files-list">
                {files.map((fileUrl, index) => (
                  <button
                    key={index}
                    className="file-download-btn"
                    onClick={() => onDownload(fileUrl, `project-file-${index + 1}`)}
                  >
                    <FaDownload />
                    File {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Grading Section */}
          <div className="grading-section">
            <h5>Grading</h5>
            
            {/* Group Grade */}
            <div className="grade-input">
              <label>Group Grade (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={groupGrade}
                onChange={(e) => setGroupGrade(e.target.value)}
                placeholder="Enter group grade"
              />
            </div>

            {/* Individual Grades */}
            <div className="individual-grades">
              <h6>Individual Grades</h6>
              {submission.group?.members?.map(member => (
                <div key={member.id} className="individual-grade-row">
                  <div className="student-info">
                    <img 
                      src={member.student.profile_picture_url || '/default-avatar.png'} 
                      alt={member.student.first_name}
                      className="student-avatar"
                    />
                    <span className="student-name">
                      {member.student.first_name} {member.student.last_name}
                    </span>
                  </div>
                  
                  <div className="grade-controls">
                    <button
                      className={`toggle-same-grade ${sameAsGroupGrade[member.student.id] ? 'active' : ''}`}
                      onClick={() => setSameAsGroupGrade(prev => ({
                        ...prev,
                        [member.student.id]: !prev[member.student.id]
                      }))}
                    >
                      {sameAsGroupGrade[member.student.id] ? <FaToggleOn /> : <FaToggleOff />}
                      Same as Group Grade
                    </button>
                    
                    {!sameAsGroupGrade[member.student.id] && (
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={individualGrades[member.student.id] || ''}
                        onChange={(e) => setIndividualGrades(prev => ({
                          ...prev,
                          [member.student.id]: e.target.value
                        }))}
                        placeholder="Individual grade"
                        className="individual-grade-input"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Feedback */}
            <div className="feedback-input">
              <label>Feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter feedback for this submission..."
                rows={3}
              />
            </div>

            {/* Grade Button */}
            <button
              className="grade-button"
              onClick={handleGradeSubmission}
              disabled={grading || !groupGrade}
            >
              {grading ? (
                <>
                  <div className="mini-spinner"></div>
                  Saving Grade...
                </>
              ) : (
                <>
                  <FaSave />
                  Save Grade
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Phase Submission Card Component
const PhaseSubmissionCard = ({ submission, taskSubmissions, onDownload, expanded, onToggleExpanded }) => {
  const [grading, setGrading] = useState(false);
  const [groupGrade, setGroupGrade] = useState(submission.grade || '');
  const [feedback, setFeedback] = useState(submission.feedback || '');

  const parseFileUrls = (fileUrls) => {
    if (!fileUrls) return [];
    try {
      return Array.isArray(fileUrls) ? fileUrls : JSON.parse(fileUrls);
    } catch {
      return [];
    }
  };

  const handleGradePhase = async () => {
    try {
      setGrading(true);
      
      const response = await fetch(
        `${apiConfig.baseURL}/api/professor-grading/phases/${submission.phase_id}/submissions/${submission.id}/grade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            groupGrade: parseFloat(groupGrade),
            feedback: feedback
          })
        }
      );

      if (response.ok) {
        alert('Phase submission graded successfully!');
      }
    } catch (error) {
      console.error('Error grading phase submission:', error);
      alert('Error grading phase submission');
    } finally {
      setGrading(false);
    }
  };

  const files = parseFileUrls(submission.file_urls);

  return (
    <div className={`submission-card phase-submission ${expanded ? 'expanded' : ''}`}>
      <div className="card-header" onClick={onToggleExpanded}>
        <div className="submission-info">
          <h4>{submission.group?.group_name || `Group ${submission.group?.group_number}`}</h4>
          <div className="submission-meta">
            <span className="date">
              <FaClock />
              {new Date(submission.submission_date).toLocaleDateString()}
            </span>
            <span className={`status ${submission.status}`}>
              {submission.grade ? `${submission.grade}%` : submission.status}
            </span>
          </div>
        </div>
        <div className="card-actions">
          {expanded ? <FaChevronUp /> : <FaChevronDown />}
        </div>
      </div>

      {expanded && (
        <div className="card-content">
          {/* Phase Files */}
          {files.length > 0 && (
            <div className="submission-files">
              <h5>Phase Deliverable Files</h5>
              <div className="files-list">
                {files.map((fileUrl, index) => (
                  <button
                    key={index}
                    className="file-download-btn"
                    onClick={() => onDownload(fileUrl, `phase-file-${index + 1}`)}
                  >
                    <FaDownload />
                    Phase File {index + 1}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Task Submissions for this Group */}
          {taskSubmissions.length > 0 && (
            <div className="task-submissions">
              <h5>Member Task Submissions</h5>
              <div className="tasks-list">
                {taskSubmissions.map(taskSubmission => (
                  <TaskSubmissionItem
                    key={taskSubmission.id}
                    taskSubmission={taskSubmission}
                    onDownload={onDownload}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Phase Grading */}
          <div className="grading-section">
            <h5>Phase Grade</h5>
            
            <div className="grade-input">
              <label>Group Grade (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={groupGrade}
                onChange={(e) => setGroupGrade(e.target.value)}
                placeholder="Enter phase grade"
              />
            </div>

            <div className="feedback-input">
              <label>Feedback</label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter feedback for this phase submission..."
                rows={3}
              />
            </div>

            <button
              className="grade-button"
              onClick={handleGradePhase}
              disabled={grading || !groupGrade}
            >
              {grading ? (
                <>
                  <div className="mini-spinner"></div>
                  Saving Grade...
                </>
              ) : (
                <>
                  <FaSave />
                  Save Phase Grade
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Task Submission Item Component
const TaskSubmissionItem = ({ taskSubmission, onDownload }) => {
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState(taskSubmission.grade || '');
  const [feedback, setFeedback] = useState(taskSubmission.feedback || '');

  const handleGradeTask = async () => {
    try {
      setGrading(true);
      
      const response = await fetch(
        `${apiConfig.baseURL}/api/professor-grading/tasks/${taskSubmission.task_id}/submissions/${taskSubmission.id}/grade`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            grade: parseFloat(grade),
            feedback: feedback
          })
        }
      );

      if (response.ok) {
        alert('Task submission graded successfully!');
      }
    } catch (error) {
      console.error('Error grading task submission:', error);
      alert('Error grading task submission');
    } finally {
      setGrading(false);
    }
  };

  const parseFileUrls = (fileUrls) => {
    if (!fileUrls) return [];
    try {
      return Array.isArray(fileUrls) ? fileUrls : JSON.parse(fileUrls);
    } catch {
      return [];
    }
  };

  const files = parseFileUrls(taskSubmission.file_urls);

  return (
    <div className="task-submission-item">
      <div className="task-header">
        <div className="task-info">
          <h6>{taskSubmission.task?.title || 'Task'}</h6>
          <div className="task-meta">
            <span className="assignee">
              <FaUser />
              {taskSubmission.submitted_by_student?.first_name} {taskSubmission.submitted_by_student?.last_name}
            </span>
            <span className="date">
              <FaClock />
              {new Date(taskSubmission.submission_date).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="task-status">
          {taskSubmission.grade ? `${taskSubmission.grade}%` : taskSubmission.status}
        </div>
      </div>

      <div className="task-content">
        {/* Task Files */}
        {files.length > 0 && (
          <div className="task-files">
            {files.map((fileUrl, index) => (
              <button
                key={index}
                className="file-download-btn small"
                onClick={() => onDownload(fileUrl, `task-file-${index + 1}`)}
              >
                <FaDownload />
                Task File {index + 1}
              </button>
            ))}
          </div>
        )}

        {/* Task Grading */}
        <div className="task-grading">
          <div className="grade-input-inline">
            <input
              type="number"
              min="0"
              max="100"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="Grade"
              className="task-grade-input"
            />
            <button
              className="grade-task-btn"
              onClick={handleGradeTask}
              disabled={grading || !grade}
            >
              {grading ? (
                <div className="mini-spinner"></div>
              ) : (
                <FaSave />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectGradingDashboard;