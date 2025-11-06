import re

# Read the file
file_path = r'C:\Users\nnooopi\Desktop\S-MAN SYSTEM\frontend\src\components\CourseStudentDashboard.js'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the PROJECT Member Submissions section (line ~16835)
# We'll look for the specific pattern that's unique to the project section
# The project section has "member.profile_image_url" while phase section doesn't

# Pattern to find: the task display section in PROJECT Member Submissions
# This section starts after "Assigned Tasks ({memberTaskList.length})" 
# and is within the section that has "member.profile_image_url"

old_code = '''                    ) : (
                      <>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          maxHeight: isExpanded ? '300px' : '120px',
                          overflowY: isExpanded ? 'auto' : 'hidden',
                          paddingRight: isExpanded ? '6px' : '0'
                        }}>
                          {memberTaskList.length > 0 ? (
                            (isExpanded ? memberTaskList : memberTaskList.slice(0, visibleTasksCount)).map((task, taskIdx) => (
                              <div
                                key={taskIdx}
                                style={{
                                  backgroundColor: '#F0FAFB',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '8px',
                                  padding: '10px 12px',
                                  fontSize: '12px',
                                  color: '#2c3e50',
                                  textAlign: 'left',
                                  lineHeight: '1.4',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s ease',
                                  hover: { backgroundColor: '#E0F2FE' },
                                  position: 'relative',
                                  paddingRight: '90px'
                                }}
                                title={task.description || task.title}
                              >
                                {/* Task Status - Top Right */}
                                {task.status && (
                                  <div style={{
                                    position: 'absolute',
                                    top: '6px',
                                    right: '8px',
                                    fontSize: '10px',
                                    fontWeight: '600',
                                    color: task.status === 'completed' ? '#059669' : task.status === 'pending' ? '#DC2626' : task.status === 'to_revise' ? '#EA580C' : '#6B7280',
                                    backgroundColor: task.status === 'completed' ? '#D1FAE5' : task.status === 'pending' ? '#FEE2E2' : task.status === 'to_revise' ? '#FFEDD5' : '#F3F4F6',
                                    padding: '3px 6px',
                                    borderRadius: '4px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    whiteSpace: 'nowrap'
                                  }}>
                                    {task.status === 'completed' ? (
                                      <><FaCheck size={9} />Completed</>
                                    ) : task.status === 'pending' ? (
                                      <><FaClock size={9} />Pending</>
                                    ) : task.status === 'to_revise' ? (
                                      <><FaExclamationTriangle size={9} />Revision</>
                                    ) : (
                                      <><FaFileAlt size={9} />{task.status.replace(/_/g, ' ')}</>
                                    )}
                                  </div>
                                )}

                                <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '13px', paddingRight: '0' }}>
                                  {task.title?.length > 25 ? task.title.substring(0, 25) + '...' : task.title}
                                </div>
                                {task.due_date && (
                                  <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FaCalendarAlt size={10} />
                                    {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div style={{
                              fontSize: '12px',
                              color: '#9CA3AF',
                              fontStyle: 'italic',
                              padding: '12px 8px'
                            }}>
                              No tasks assigned
                            </div>
                          )}
                        </div>
                        
                        {/* View More Button */}
                        {hasMoreTasks && (
                          <button
                            onClick={() => toggleCardExpansion(memberId)}
                            style={{
                              width: '100%',
                              marginTop: '10px',
                              padding: '8px 12px',
                              backgroundColor: isExpanded ? '#E5E7EB' : '#34656D',
                              color: isExpanded ? '#2c3e50' : 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = isExpanded ? '#D1D5DB' : '#2c545b';
                              e.target.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = isExpanded ? '#E5E7EB' : '#34656D';
                              e.target.style.transform = 'translateY(0)';
                            }}
                          >
                            {isExpanded 
                              ? `▲ Show Less (${memberTaskList.length})` 
                              : `▼ View More (+${memberTaskList.length - visibleTasksCount})`
                            }
                          </button>
                        )}
                      </>
                    )}'''

new_code = '''                    ) : (
                      <>
                        {memberTaskList.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {(() => {
                              // Group tasks by phase_id
                              const tasksByPhase = {};
                              memberTaskList.forEach(task => {
                                const phaseId = task.phase_id || 'unknown';
                                if (!tasksByPhase[phaseId]) tasksByPhase[phaseId] = [];
                                tasksByPhase[phaseId].push(task);
                              });

                              // Sort phases numerically
                              const sortedPhases = Object.keys(tasksByPhase).sort((a, b) => {
                                const numA = parseInt(a) || 999;
                                const numB = parseInt(b) || 999;
                                return numA - numB;
                              });

                              return sortedPhases.map(phaseId => {
                                const phaseKey = `${memberId}-${phaseId}`;
                                const isPhaseExpanded = expandedPhaseDropdowns[phaseKey] || false;
                                const phaseTasks = tasksByPhase[phaseId];

                                return (
                                  <div key={phaseId} style={{ border: '1px solid #D1D5DB', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#FFFFFF' }}>
                                    {/* Phase Dropdown Header */}
                                    <button
                                      onClick={() => togglePhaseDropdown(memberId, phaseId)}
                                      style={{
                                        width: '100%', padding: '10px 12px',
                                        backgroundColor: isPhaseExpanded ? '#E0F2FE' : '#F9FAFB',
                                        color: '#2c3e50', border: 'none',
                                        borderBottom: isPhaseExpanded ? '1px solid #BFDBFE' : 'none',
                                        fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                                        transition: 'all 0.2s ease', display: 'flex',
                                        alignItems: 'center', justifyContent: 'space-between', gap: '8px'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = isPhaseExpanded ? '#0EA5E9' : '#E5E7EB';
                                        e.currentTarget.style.color = isPhaseExpanded ? 'white' : '#2c3e50';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = isPhaseExpanded ? '#E0F2FE' : '#F9FAFB';
                                        e.currentTarget.style.color = '#2c3e50';
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '14px' }}>{isPhaseExpanded ? '▼' : '▶'}</span>
                                        <span>Phase {phaseId}</span>
                                        <span style={{ backgroundColor: '#BFDBFE', color: '#1E40AF', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>
                                          {phaseTasks.length}
                                        </span>
                                      </div>
                                    </button>

                                    {/* Phase Tasks */}
                                    {isPhaseExpanded && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 12px', maxHeight: '300px', overflowY: 'auto' }}>
                                        {phaseTasks.map((task, taskIdx) => (
                                          <div key={taskIdx} style={{ backgroundColor: '#F0FAFB', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '10px 12px', fontSize: '12px', color: '#2c3e50', textAlign: 'left', lineHeight: '1.4', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative', paddingRight: '85px' }} title={task.description || task.title}>
                                            {/* Task Status */}
                                            {task.status && (
                                              <div style={{
                                                position: 'absolute', top: '6px', right: '8px', fontSize: '10px', fontWeight: '600',
                                                color: task.status === 'completed' ? '#059669' : task.status === 'pending' ? '#DC2626' : task.status === 'to_revise' ? '#EA580C' : '#6B7280',
                                                backgroundColor: task.status === 'completed' ? '#D1FAE5' : task.status === 'pending' ? '#FEE2E2' : task.status === 'to_revise' ? '#FFEDD5' : '#F3F4F6',
                                                padding: '3px 6px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap'
                                              }}>
                                                {task.status === 'completed' ? <><FaCheck size={9} />Completed</> : task.status === 'pending' ? <><FaClock size={9} />Pending</> : task.status === 'to_revise' ? <><FaExclamationTriangle size={9} />Revision</> : <><FaFileAlt size={9} />{task.status.replace(/_/g, ' ')}</>}
                                              </div>
                                            )}
                                            <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '13px', paddingRight: '0' }}>
                                              {task.title?.length > 25 ? task.title.substring(0, 25) + '...' : task.title}
                                            </div>
                                            {task.due_date && (
                                              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <FaCalendarAlt size={10} />
                                                {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        ) : (
                          <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', padding: '12px 8px', textAlign: 'center' }}>
                            No tasks assigned
                          </div>
                        )}
                      </>
                    )}'''

# Find all occurrences
matches = list(re.finditer(re.escape(old_code), content))
print(f"Found {len(matches)} matches")

if len(matches) == 2:
    # We want the SECOND occurrence (the project one)
    # Replace from end to start to preserve positions
    start_pos = matches[1].start()
    end_pos = matches[1].end()
    
    new_content = content[:start_pos] + new_code + content[end_pos:]
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    print("✅ Successfully replaced the PROJECT Member Submissions task display with phase dropdowns!")
    print(f"   Replaced at position {start_pos} (second occurrence)")
else:
    print(f"❌ Error: Expected 2 matches but found {len(matches)}")
    print("   This pattern appears in both Phase and Project sections")
    for i, match in enumerate(matches):
        print(f"   Match {i+1} at position {match.start()}")
