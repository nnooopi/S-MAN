import React, { useState, useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const EvaluationDetailModal = ({ isOpen, onClose, evaluation }) => {
  const [selectedMember, setSelectedMember] = useState(null);

  // Reset selected member whenever the evaluation changes
  useEffect(() => {
    setSelectedMember(null);
  }, [evaluation?.id]);

  if (!isOpen || !evaluation) return null;

  // For given evaluations, show all members
  const members = evaluation.evaluatedMembers || [];
  const memberToDisplay = selectedMember || members[0];

  // For received evaluations, just show the scores
  const isGivenEvaluation = evaluation.evaluationViewFilter === 'given';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200001,
        backdropFilter: 'blur(2px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'rgb(9, 18, 44)',
          borderRadius: '0px',
          border: '1px solid rgba(95, 95, 95, 0.3)',
          padding: '0px',
          maxWidth: '1000px',
          width: '90%',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'flex',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(3.2px) saturate(120%)',
          WebkitBackdropFilter: 'blur(3.2px) saturate(120%)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left Sidebar */}
        <div
          style={{
            width: '300px',
            borderRight: '1px solid rgba(95, 95, 95, 0.3)',
            backgroundColor: 'rgba(9, 18, 44, 0.5)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div style={{
            padding: '20px',
            borderBottom: '1px solid rgba(95, 95, 95, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            backgroundColor: 'rgb(9, 18, 44)',
            zIndex: 100
          }}>
            <h3 style={{ margin: 0, color: '#FAF8F1', fontSize: '16px', fontWeight: '600' }}>
              Evaluation Details
            </h3>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#cbd5e0',
                cursor: 'pointer',
                fontSize: '20px',
                padding: '0'
              }}
            >
              <FaTimes />
            </button>
          </div>

          {/* Overview Button */}
          <button
            onClick={() => setSelectedMember(null)}
            style={{
              padding: '16px 20px',
              border: 'none',
              backgroundColor: !selectedMember ? 'rgba(135, 35, 65, 0.2)' : 'transparent',
              color: !selectedMember ? '#872341' : '#cbd5e0',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '14px',
              fontWeight: !selectedMember ? '600' : '500',
              borderBottom: '1px solid rgba(95, 95, 95, 0.2)',
              transition: 'all 0.2s ease',
              borderLeft: !selectedMember ? '3px solid #872341' : '3px solid transparent'
            }}
            onMouseEnter={(e) => {
              if (selectedMember !== null) {
                e.target.style.backgroundColor = 'rgba(135, 35, 65, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedMember !== null) {
                e.target.style.backgroundColor = 'transparent';
              }
            }}
          >
            Overview
          </button>

          {/* Members List (show for both given and received) */}
          {members.length > 0 && (
            <div style={{ flex: 1 }}>
              {members.map((member, index) => (
                <button
                  key={`member-${member.studentId}-${index}`}
                  onClick={() => setSelectedMember(member)}
                  style={{
                    padding: '16px 20px',
                    border: 'none',
                    width: '100%',
                    backgroundColor: selectedMember?.studentId === member.studentId ? 'rgba(135, 35, 65, 0.2)' : 'transparent',
                    color: selectedMember?.studentId === member.studentId ? '#872341' : '#cbd5e0',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '13px',
                    fontWeight: selectedMember?.studentId === member.studentId ? '600' : '500',
                    borderBottom: '1px solid rgba(95, 95, 95, 0.2)',
                    transition: 'all 0.2s ease',
                    borderLeft: selectedMember?.studentId === member.studentId ? '3px solid #872341' : '3px solid transparent'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedMember?.studentId !== member.studentId) {
                      e.target.style.backgroundColor = 'rgba(135, 35, 65, 0.1)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedMember?.studentId !== member.studentId) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '13px' }}>{member.studentName || `Member ${member.memberNumber}`}</span>
                    <span style={{ fontSize: '11px', color: '#999', fontWeight: 'normal' }}>
                      {isGivenEvaluation ? `Score: ${member.total}/100` : (member.total !== null ? `Score: ${member.total}` : 'File Submitted')}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Content Area */}
        <div
          style={{
            flex: 1,
            padding: '30px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            overflowY: 'auto',
            maxHeight: '90vh'
          }}
        >
          {/* Content Header */}
          <div style={{ paddingBottom: '20px', borderBottom: '1px solid rgba(95, 95, 95, 0.3)' }}>
            <h2 style={{ margin: '0 0 8px 0', color: '#FAF8F1', fontSize: '20px', fontWeight: '600' }}>
              {!selectedMember ? 'Evaluation Overview' : `${selectedMember.studentName || `Member ${selectedMember.memberNumber}`} Details`}
            </h2>
            <p style={{ margin: 0, color: '#cbd5e0', fontSize: '13px' }}>
              {evaluation.type === 'phase' ? `Phase ${evaluation.phaseNumber}: ${evaluation.phaseName}` : `Project: ${evaluation.projectTitle}`}
            </p>
          </div>

          {/* Overview Content */}
          {!selectedMember && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Evaluation Info */}
              <div>
                <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                  Information
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'rgba(135, 35, 65, 0.1)', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 4px 0', color: '#cbd5e0', fontSize: '11px', textTransform: 'uppercase' }}>
                      Evaluation Type
                    </p>
                    <p style={{ margin: 0, color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                      {evaluation.evaluationType || (evaluation.type === 'phase' ? 'Phase Evaluation' : 'Project Evaluation')}
                    </p>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: 'rgba(135, 35, 65, 0.1)', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 4px 0', color: '#cbd5e0', fontSize: '11px', textTransform: 'uppercase' }}>
                      Submission Date
                    </p>
                    <p style={{ margin: 0, color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                      {new Date(evaluation.submissionDate || evaluation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Group Info */}
              <div>
                <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                  Group
                </h3>
                <div style={{ padding: '12px', backgroundColor: 'rgba(135, 35, 65, 0.1)', borderRadius: '4px' }}>
                  <p style={{ margin: 0, color: '#FAF8F1', fontSize: '14px', fontWeight: '500' }}>
                    {evaluation.groupName}
                  </p>
                </div>
              </div>

              {/* Custom File Submission */}
              {evaluation.isCustomEvaluation && evaluation.fileSubmission?.fileUrl && (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                    📄 File Submission
                  </h3>
                  <div style={{ padding: '12px', backgroundColor: 'rgba(135, 35, 65, 0.1)', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#cbd5e0', fontSize: '12px' }}>
                      {evaluation.fileSubmission.fileName}
                    </p>
                    <a 
                      href={evaluation.fileSubmission.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '8px 12px',
                        backgroundColor: '#872341',
                        color: '#FAF8F1',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#a82e50';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#872341';
                      }}
                    >
                      Download File
                    </a>
                  </div>
                </div>
              )}

              {/* Members Summary (for given) */}
              {isGivenEvaluation && members.length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                    Members Evaluated ({members.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {members.map((member, index) => (
                      <div key={`overview-member-${member.studentId}-${index}`}
                        style={{
                          padding: '10px',
                          backgroundColor: 'rgba(135, 35, 65, 0.05)',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ color: '#FAF8F1', fontSize: '13px' }}>{member.studentName || `Member ${member.memberNumber}`}</span>
                        <span style={{ color: '#872341', fontSize: '14px', fontWeight: '600' }}>
                          {member.total}/100
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Received Evaluation Overview - Average Score */}
              {!isGivenEvaluation && (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                    Average Score
                  </h3>
                  <div style={{ padding: '16px', backgroundColor: 'rgba(135, 35, 65, 0.1)', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#cbd5e0', fontSize: '12px' }}>Combined Score</p>
                    <p style={{ margin: 0, color: '#872341', fontSize: '32px', fontWeight: '700' }}>
                      {evaluation.scores?.total || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Member Details Content */}
          {selectedMember && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Member Score Summary or File */}
              {selectedMember.hasFile && selectedMember.fileSubmission ? (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                    📄 File Submission
                  </h3>
                  <div style={{ padding: '12px', backgroundColor: 'rgba(135, 35, 65, 0.1)', borderRadius: '4px' }}>
                    <p style={{ margin: '0 0 8px 0', color: '#cbd5e0', fontSize: '12px' }}>
                      {selectedMember.fileSubmission.fileName}
                    </p>
                    <a 
                      href={selectedMember.fileSubmission.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-block',
                        padding: '8px 12px',
                        backgroundColor: '#872341',
                        color: '#FAF8F1',
                        borderRadius: '4px',
                        textDecoration: 'none',
                        fontSize: '12px',
                        fontWeight: '600',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#a82e50';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#872341';
                      }}
                    >
                      Download File
                    </a>
                  </div>
                </div>
              ) : (
                <div style={{
                  padding: '16px',
                  backgroundColor: 'rgba(135, 35, 65, 0.1)',
                  borderRadius: '4px'
                }}>
                  <p style={{ margin: '0 0 8px 0', color: '#cbd5e0', fontSize: '12px' }}>Total Score</p>
                  <p style={{ margin: 0, color: '#872341', fontSize: '32px', fontWeight: '700' }}>
                    {selectedMember.total}/100
                  </p>
                </div>
              )}

              {/* Rubric Grades */}
              {!selectedMember.hasFile && selectedMember.criteria && Object.keys(selectedMember.criteria).length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                    Rubric Scores
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(selectedMember.criteria).map(([criterion, score], index) => (
                      <div key={`criterion-${index}`}
                        style={{
                          padding: '12px',
                          backgroundColor: 'rgba(135, 35, 65, 0.05)',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderLeft: '3px solid #872341'
                        }}
                      >
                        <span style={{ color: '#FAF8F1', fontSize: '13px', fontWeight: '500' }}>
                          {criterion}
                        </span>
                        <span style={{ color: '#872341', fontSize: '16px', fontWeight: '700' }}>
                          {score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              {selectedMember.feedback && (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                    Feedback
                  </h3>
                  <p style={{
                    padding: '12px',
                    backgroundColor: 'rgba(135, 35, 65, 0.05)',
                    borderRadius: '4px',
                    margin: 0,
                    color: '#cbd5e0',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}>
                    {selectedMember.feedback}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Received Evaluation Details */}
          {!selectedMember && !isGivenEvaluation && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Rubric Scores */}
              {evaluation.scores?.criteria && Object.keys(evaluation.scores.criteria).length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                    Rubric Scores
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {Object.entries(evaluation.scores.criteria).map(([criterion, score], index) => (
                      <div key={`criterion-${index}`}
                        style={{
                          padding: '12px',
                          backgroundColor: 'rgba(135, 35, 65, 0.05)',
                          borderRadius: '4px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderLeft: '3px solid #872341'
                        }}
                      >
                        <span style={{ color: '#FAF8F1', fontSize: '13px', fontWeight: '500' }}>
                          {criterion}
                        </span>
                        <span style={{ color: '#872341', fontSize: '16px', fontWeight: '700' }}>
                          {score}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              {evaluation.scores?.feedback && (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                    Feedback
                  </h3>
                  <p style={{
                    padding: '12px',
                    backgroundColor: 'rgba(135, 35, 65, 0.05)',
                    borderRadius: '4px',
                    margin: 0,
                    color: '#cbd5e0',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}>
                    {evaluation.scores.feedback}
                  </p>
                </div>
              )}

              {/* Strengths */}
              {evaluation.scores?.strengths && (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                    Strengths
                  </h3>
                  <p style={{
                    padding: '12px',
                    backgroundColor: 'rgba(135, 35, 65, 0.05)',
                    borderRadius: '4px',
                    margin: 0,
                    color: '#cbd5e0',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}>
                    {evaluation.scores.strengths}
                  </p>
                </div>
              )}

              {/* Improvements */}
              {evaluation.scores?.improvements && (
                <div>
                  <h3 style={{ margin: '0 0 12px 0', color: '#FAF8F1', fontSize: '14px', fontWeight: '600' }}>
                    Areas for Improvement
                  </h3>
                  <p style={{
                    padding: '12px',
                    backgroundColor: 'rgba(135, 35, 65, 0.05)',
                    borderRadius: '4px',
                    margin: 0,
                    color: '#cbd5e0',
                    fontSize: '13px',
                    lineHeight: '1.5'
                  }}>
                    {evaluation.scores.improvements}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EvaluationDetailModal;
