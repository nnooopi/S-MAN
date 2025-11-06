import React, { useState, useEffect } from 'react';
import { X, Users, Shuffle, User, Lock } from 'lucide-react';

const SimplifiedGroupCreator = ({ courseId, students, groups, studentToAssign, onClose, onGroupsCreated, getSupabaseImageUrl }) => {
  // Get the highest existing group number for proper numbering
  const getHighestGroupNumber = () => {
    if (!groups || groups.length === 0) return 0;
    const numbers = groups
      .map(g => {
        const match = (g.group_name || g.groupName || '').match(/Group\s*(\d+)/i);
        return match ? parseInt(match[1]) : 0;
      })
      .filter(n => !isNaN(n));
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  };

  const [groupType, setGroupType] = useState('random');
  const [numberOfGroups, setNumberOfGroups] = useState(4);
  const [minMembers, setMinMembers] = useState(3);
  const [maxMembers, setMaxMembers] = useState(5);
  const [manualGroups, setManualGroups] = useState([]);
  const [unassignedStudents, setUnassignedStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('lastName');
  const [searchQuery, setSearchQuery] = useState('');
  const [highestGroupNumber, setHighestGroupNumber] = useState(getHighestGroupNumber());
  
  // Check if groups already exist and lock min/max members settings
  const hasExistingGroups = groups && groups.length > 0;
  const [settingsLocked, setSettingsLocked] = useState(hasExistingGroups);
  
  // Initialize min/max members from existing groups if they exist
  useEffect(() => {
    if (hasExistingGroups && groups.length > 0) {
      const firstGroup = groups[0];
      if (firstGroup.min_members) {
        setMinMembers(firstGroup.min_members);
      }
      if (firstGroup.max_members) {
        setMaxMembers(firstGroup.max_members);
      }
      setSettingsLocked(true);
    }
  }, [hasExistingGroups, groups]);
  
  // Use the parent's getSupabaseImageUrl function if provided, otherwise use the local fallback
  // The parent function only takes imagePath, so we wrap it to ignore the second parameter
  const getImageUrl = getSupabaseImageUrl 
    ? (imagePath, studentId) => getSupabaseImageUrl(imagePath)
    : (imagePath, studentId) => {
        if (!imagePath) return null;
        
        // If it's already a full URL (http/https), return it
        if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          return imagePath;
        }
        
        // If it already starts with /api/files, return it
        if (imagePath.startsWith('/api/files/')) {
          return `http://localhost:5000${imagePath}`;
        }
        
        // Otherwise construct the backend API endpoint URL
        // Backend serves files via /api/files/:userId/:filename
        if (studentId) {
          return `http://localhost:5000/api/files/${studentId}/${imagePath}`;
        }
        
        // Fallback: try to extract student ID from the path if it's in format: studentId/filename
        const pathParts = imagePath.split('/');
        if (pathParts.length >= 2) {
          return `http://localhost:5000/api/files/${pathParts[0]}/${pathParts[1]}`;
        }
        
        return null;
      };
  
  
  // Enhanced features - removed smart balancing
  const [groupTemplates, setGroupTemplates] = useState([
    { name: 'Small Groups', groups: 6, minMembers: 2, maxMembers: 3 },
    { name: 'Medium Groups', groups: 4, minMembers: 3, maxMembers: 5 },
    { name: 'Large Groups', groups: 3, minMembers: 4, maxMembers: 6 },
    { name: 'Balanced Teams', groups: 5, minMembers: 3, maxMembers: 4 }
  ]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  // Removed analytics feature
  const [previewGroups, setPreviewGroups] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showNoStudentsNotification, setShowNoStudentsNotification] = useState(true);
  
  // Auto-navigate to manual tab when student is being assigned
  useEffect(() => {
    if (studentToAssign) {
      setGroupType('manual');
    }
  }, [studentToAssign]);

  useEffect(() => {
    // Filter out students who are already assigned to groups in this course
    const unassignedStudents = students.filter(student => 
      !groups.some(group => 
        group.course_group_members?.some(member => 
          member.student_id === student.student_id || member.student_id === student.id
        )
      )
    );
    
    // Sort students by last name initially
    const sortedStudents = [...unassignedStudents].sort((a, b) => {
      const aName = a.last_name || '';
      const bName = b.last_name || '';
      return aName.localeCompare(bName);
    });
    setUnassignedStudents(sortedStudents);
    initializeManualGroups();
  }, [students, groups]);

  // Update manual groups when number changes
  useEffect(() => {
    if (groupType === 'manual') {
      initializeManualGroups();
    }
  }, [numberOfGroups, groupType]);

  const initializeManualGroups = () => {
    const currentGroups = [...manualGroups];
    const groups = [];
    const targetGroups = parseInt(numberOfGroups) || 1;
    
    // Preserve existing groups and their assignments
    for (let i = 0; i < targetGroups; i++) {
      if (currentGroups[i]) {
        groups.push(currentGroups[i]);
      } else {
        groups.push({
          groupName: `Group ${highestGroupNumber + i + 1}`,
          leaders: [],
          members: []
        });
      }
    }
    
    // If reducing groups, move students from removed groups back to unassigned
    if (targetGroups < currentGroups.length) {
      const removedGroups = currentGroups.slice(targetGroups);
      const studentsToReassign = [];
      
      removedGroups.forEach(group => {
        studentsToReassign.push(...group.leaders, ...group.members);
      });
      
      if (studentsToReassign.length > 0) {
        setUnassignedStudents(prev => {
          const combined = [...prev, ...studentsToReassign];
          return combined.sort((a, b) => {
            const aName = a.last_name || '';
            const bName = b.last_name || '';
            return aName.localeCompare(bName);
          });
        });
      }
    }
    
    setManualGroups(groups);
  };

  // Get filtered and sorted students
  const getFilteredStudents = () => {
    let filtered = unassignedStudents;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(student => {
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
        const studentNumber = (student.student_number || '').toLowerCase();
        const program = (student.program || '').toLowerCase();
        return fullName.includes(query) || studentNumber.includes(query) || program.includes(query);
      });
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'firstName':
          return (a.first_name || '').localeCompare(b.first_name || '');
        case 'lastName':
          return (a.last_name || '').localeCompare(b.last_name || '');
        case 'studentNumber':
          return (a.student_number || '').localeCompare(b.student_number || '');
        case 'program':
          return (a.program || '').localeCompare(b.program || '');
        case 'yearLevel':
          return (a.year_level || 0) - (b.year_level || 0);
        case 'classPosition':
          return (a.class_position || '').localeCompare(b.class_position || '');
        default:
          return (a.last_name || '').localeCompare(b.last_name || '');
      }
    });
  };

  // Generate random groups for preview
  const generateRandomGroups = () => {
    console.log('🎲 Generate button clicked!');
    console.log('📊 Unassigned students:', unassignedStudents.length);
    console.log('📊 Students:', students.length);
    
    if (unassignedStudents.length === 0) {
      setError('No unassigned students available for grouping');
      return;
    }

    const shuffledStudents = [...unassignedStudents].sort(() => Math.random() - 0.5);
    const groups = [];
    const targetGroups = parseInt(numberOfGroups);
    const minMembersPerGroup = parseInt(minMembers);
    const maxMembersPerGroup = parseInt(maxMembers);

    console.log('🎯 Target groups:', targetGroups);
    console.log('👥 Min/Max members:', minMembersPerGroup, maxMembersPerGroup);

    // Calculate optimal distribution
    const totalStudents = shuffledStudents.length;
    const avgMembersPerGroup = Math.floor(totalStudents / targetGroups);
    
    let studentIndex = 0;
    
    for (let i = 0; i < targetGroups && studentIndex < totalStudents; i++) {
      const groupStudents = [];
      const remainingGroups = targetGroups - i;
      const remainingStudents = totalStudents - studentIndex;
      
      // Calculate members for this group
      let membersInGroup = Math.min(
        Math.max(minMembersPerGroup, Math.floor(remainingStudents / remainingGroups)),
        maxMembersPerGroup
      );
      
      // Ensure we don't exceed remaining students
      membersInGroup = Math.min(membersInGroup, remainingStudents);
      
      // Add students to group
      for (let j = 0; j < membersInGroup && studentIndex < totalStudents; j++) {
        groupStudents.push(shuffledStudents[studentIndex]);
        studentIndex++;
      }
      
      if (groupStudents.length > 0) {
        groups.push({
          groupName: `Group ${i + 1}`,
          groupNumber: i + 1,
          members: groupStudents,
          leader: groupStudents[0] // First student becomes leader
        });
      }
    }
    
    console.log('✅ Generated groups:', groups.length);
    setPreviewGroups(groups);
    setShowPreview(true);
    setError('');
  };

  // Clear preview
  const clearPreview = () => {
    setPreviewGroups([]);
    setShowPreview(false);
  };

  // Bulk operations
  const assignAllToGroups = () => {
    const studentsToAssign = [...unassignedStudents];
    let currentGroupIndex = 0;
    
    studentsToAssign.forEach(student => {
      // Find next group with space
      while (currentGroupIndex < manualGroups.length && 
             manualGroups[currentGroupIndex].members.length >= maxMembers) {
        currentGroupIndex++;
      }
      
      if (currentGroupIndex < manualGroups.length) {
        assignStudentToGroup(student, currentGroupIndex, 'member');
        currentGroupIndex++;
      }
    });
  };

  const clearAllAssignments = () => {
    const allAssignedStudents = [];
    manualGroups.forEach(group => {
      allAssignedStudents.push(...group.leaders, ...group.members);
    });
    
    setManualGroups(manualGroups.map(group => ({
      ...group,
      leaders: [],
      members: []
    })));
    
    setUnassignedStudents([...unassignedStudents, ...allAssignedStudents]);
  };

  const handleCreateGroups = async () => {
    setLoading(true);
    setError('');

    try {
      const payload = {
        groupType,
        numberOfGroups: parseInt(numberOfGroups),
        minMembers: parseInt(minMembers),
        maxMembers: parseInt(maxMembers)
      };

      if (groupType === 'manual') {
        // Filter out empty groups and validate
        const validGroups = manualGroups.filter(group => 
          group.leaders.length > 0 || group.members.length > 0
        );

        if (validGroups.length === 0) {
          setError('Please assign at least one student to create groups');
          setLoading(false);
          return;
        }

        // Check that each group has at least one leader
        for (let group of validGroups) {
          if (group.leaders.length === 0) {
            setError(`${group.groupName} must have at least one leader`);
            setLoading(false);
            return;
          }
        }

        payload.groupAssignments = validGroups;
      } else if (groupType === 'random' && showPreview) {
        // Convert preview groups to the format expected by the backend
        const groupAssignments = previewGroups.map(group => ({
          groupName: group.groupName,
          leaders: [group.leader],
          members: group.members.slice(1) // Rest are members
        }));
        payload.groupAssignments = groupAssignments;
      }

      const response = await fetch(
        `http://localhost:5000/api/professor/course/${courseId}/create-groups-enhanced`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create groups');
      }

      // Success - refresh parent data and close modal
      onGroupsCreated();
      onClose();
    } catch (error) {
      console.error('Group creation error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const assignStudentToGroup = (student, groupIndex, role) => {
    const newGroups = [...manualGroups];
    const newUnassigned = unassignedStudents.filter(s => s.student_id !== student.student_id);
    
    // Remove student from any other groups first
    newGroups.forEach(group => {
      group.leaders = group.leaders.filter(s => s.student_id !== student.student_id);
      group.members = group.members.filter(s => s.student_id !== student.student_id);
    });

    // Add to selected group
    if (role === 'leader') {
      newGroups[groupIndex].leaders.push(student);
    } else {
      newGroups[groupIndex].members.push(student);
    }

    setManualGroups(newGroups);
    setUnassignedStudents(newUnassigned);
  };

  const removeStudentFromGroup = (student, groupIndex, role) => {
    const newGroups = [...manualGroups];
    
    if (role === 'leader') {
      newGroups[groupIndex].leaders = newGroups[groupIndex].leaders.filter(
        s => s.student_id !== student.student_id
      );
    } else {
      newGroups[groupIndex].members = newGroups[groupIndex].members.filter(
        s => s.student_id !== student.student_id
      );
    }

    setManualGroups(newGroups);
    setUnassignedStudents([...unassignedStudents, student]);
  };

  const handleDragStart = (e, student) => {
    e.dataTransfer.setData('application/json', JSON.stringify(student));
  };

  const handleDrop = (e, groupIndex, role) => {
    e.preventDefault();
    const student = JSON.parse(e.dataTransfer.getData('application/json'));
    assignStudentToGroup(student, groupIndex, role);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999
    }}>
      <div style={{
        width: '92%',
        maxWidth: '980px',
        maxHeight: '86vh',
        position: 'relative',
        background: 'rgba(9, 18, 44, 0.15)',
        border: '0.1px solid rgb(95, 95, 95)',
        borderRadius: '0px',
        boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
        backdropFilter: 'blur(3.2px) saturate(120%)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Crosshair Corners */}
        <div className="crosshair-corner top-left">
          <div className="crosshair-h"></div>
          <div className="crosshair-v"></div>
        </div>
        <div className="crosshair-corner top-right">
          <div className="crosshair-h"></div>
          <div className="crosshair-v"></div>
        </div>
        <div className="crosshair-corner bottom-left">
          <div className="crosshair-h"></div>
          <div className="crosshair-v"></div>
        </div>
        <div className="crosshair-corner bottom-right">
          <div className="crosshair-h"></div>
          <div className="crosshair-v"></div>
        </div>

        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid rgb(135, 35, 65)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgb(255, 255, 255)'
        }}>
          <h3 style={{
            margin: 0,
            color: 'rgb(135, 35, 65)',
            fontWeight: '700',
            fontSize: '1.25rem'
          }}>Create Course Groups</h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px',
              color: 'rgb(135, 35, 65)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(135, 35, 65, 0.1)';
              e.currentTarget.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.transform = 'rotate(0deg)';
            }}
          >
            <X size={24} />
          </button>
        </div>

        <div style={{
          padding: '1.5rem',
          flex: 1,
          overflowY: 'auto',
          background: 'rgb(9, 18, 44)'
        }}>
          {error && (
            <div style={{
              background: 'rgba(244, 67, 54, 0.1)',
              border: '1px solid rgb(244, 67, 54)',
              color: 'rgb(255, 172, 172)',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontWeight: '500'
            }}>
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}

          {settingsLocked && (
            <div style={{
              background: 'rgba(255, 152, 0, 0.1)',
              border: '1px solid rgb(255, 152, 0)',
              color: 'rgb(255, 200, 100)',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1.25rem',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem'
            }}>
              <Lock size={20} style={{ flexShrink: 0 }} />
              <p style={{ margin: 0 }}>
                <strong>Settings Locked:</strong> Min/Max member settings cannot be changed while groups exist. 
                Delete all groups to modify these settings.
              </p>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '1.25rem',
            marginBottom: '1.5rem',
            justifyContent: 'center'
          }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.875rem 1.25rem',
              border: groupType === 'random' ? '2px solid rgb(135, 35, 65)' : '2px solid rgb(60, 70, 100)',
              borderRadius: '8px',
              background: groupType === 'random' ? 'rgba(135, 35, 65, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s ease',
              fontWeight: '500',
              color: groupType === 'random' ? 'white' : 'rgb(180, 180, 180)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgb(135, 35, 65)';
              e.currentTarget.style.background = 'rgba(135, 35, 65, 0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 35, 65, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = groupType === 'random' ? 'rgb(135, 35, 65)' : 'rgb(60, 70, 100)';
              e.currentTarget.style.background = groupType === 'random' ? 'rgba(135, 35, 65, 0.15)' : 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <input
                type="radio"
                value="random"
                checked={groupType === 'random'}
                onChange={(e) => setGroupType(e.target.value)}
              />
              <Users size={20} />
              Random Assignment
            </label>
            
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              cursor: 'pointer',
              padding: '0.875rem 1.25rem',
              border: groupType === 'manual' ? '2px solid rgb(135, 35, 65)' : '2px solid rgb(60, 70, 100)',
              borderRadius: '8px',
              background: groupType === 'manual' ? 'rgba(135, 35, 65, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              transition: 'all 0.2s ease',
              fontWeight: '500',
              color: groupType === 'manual' ? 'white' : 'rgb(180, 180, 180)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgb(135, 35, 65)';
              e.currentTarget.style.background = 'rgba(135, 35, 65, 0.1)';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 35, 65, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = groupType === 'manual' ? 'rgb(135, 35, 65)' : 'rgb(60, 70, 100)';
              e.currentTarget.style.background = groupType === 'manual' ? 'rgba(135, 35, 65, 0.15)' : 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              <input
                type="radio"
                value="manual"
                checked={groupType === 'manual'}
                onChange={(e) => setGroupType(e.target.value)}
              />
              <User size={20} />
              Manual Assignment (Drag & Drop)
            </label>
          </div>

          {/* Group Templates */}
          <div style={{
            marginBottom: '1.25rem',
            padding: '1.25rem',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            opacity: settingsLocked ? 0.5 : 1,
            pointerEvents: settingsLocked ? 'none' : 'auto'
          }}>
            <h4 style={{
              margin: '0 0 1rem 0',
              color: 'white',
              fontSize: '1rem',
              fontWeight: '700'
            }}>Quick Templates {settingsLocked && '(Locked)'}</h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.875rem'
            }}>
              {groupTemplates.map((template, index) => (
                <button
                  key={index}
                  disabled={settingsLocked}
                  onClick={() => {
                    if (!settingsLocked) {
                      setSelectedTemplate(template.name);
                      setNumberOfGroups(template.groups);
                      setMinMembers(template.minMembers);
                      setMaxMembers(template.maxMembers);
                    }
                  }}
                  style={{
                    padding: '1rem',
                    border: selectedTemplate === template.name ? '2px solid white' : '2px solid rgb(60, 70, 100)',
                    borderRadius: '8px',
                    background: selectedTemplate === template.name ? 'transparent' : 'rgba(255, 255, 255, 0.05)',
                    cursor: settingsLocked ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!settingsLocked) {
                      e.currentTarget.style.borderColor = 'rgb(135, 35, 65)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 35, 65, 0.25)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!settingsLocked) {
                      e.currentTarget.style.borderColor = selectedTemplate === template.name ? 'white' : 'rgb(60, 70, 100)';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <h5 style={{
                    margin: '0 0 0.5rem 0',
                    color: 'white',
                    fontSize: '0.938rem',
                    fontWeight: '600'
                  }}>{template.name}</h5>
                  <p style={{
                    margin: '0.125rem 0',
                    fontSize: '0.813rem',
                    color: 'white'
                  }}>{template.groups} groups</p>
                  <p style={{
                    margin: '0.125rem 0',
                    fontSize: '0.813rem',
                    color: 'white'
                  }}>{template.minMembers}-{template.maxMembers} members each</p>
                </button>
              ))}
            </div>
          </div>

          <div className="group-settings">
            <div className="settings-row">
              <div className="setting-group">
                <label>Number of Groups:</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={numberOfGroups}
                  onChange={(e) => {
                    setNumberOfGroups(e.target.value);
                    setSelectedTemplate(''); // Clear template selection
                    if (groupType === 'manual') {
                      initializeManualGroups();
                    }
                  }}
                />
              </div>
              
              <div className="setting-group">
                <label>Min Members per Group:</label>
                <input
                  type="number"
                  min="1"
                  value={minMembers}
                  disabled={settingsLocked}
                  onChange={(e) => {
                    setMinMembers(e.target.value);
                    setSelectedTemplate('');
                  }}
                  style={{
                    opacity: settingsLocked ? 0.6 : 1,
                    cursor: settingsLocked ? 'not-allowed' : 'text'
                  }}
                  title={settingsLocked ? 'Settings locked: Delete all groups to change' : ''}
                />
              </div>
              
              <div className="setting-group">
                <label>Max Members per Group:</label>
                <input
                  type="number"
                  min="1"
                  value={maxMembers}
                  disabled={settingsLocked}
                  onChange={(e) => {
                    setMaxMembers(e.target.value);
                    setSelectedTemplate('');
                  }}
                  style={{
                    opacity: settingsLocked ? 0.6 : 1,
                    cursor: settingsLocked ? 'not-allowed' : 'text'
                  }}
                  title={settingsLocked ? 'Settings locked: Delete all groups to change' : ''}
                />
              </div>

              {/* Generate Button for Random Assignment */}
              {groupType === 'random' && (
                <div className="setting-group generate-button-group">
                  <label>&nbsp;</label>
                  <button 
                    onClick={generateRandomGroups}
                    disabled={unassignedStudents.length === 0}
                    title={unassignedStudents.length === 0 ? 'No unassigned students available' : 'Generate random groups'}
                    style={{
                      background: unassignedStudents.length === 0 ? 'rgb(200, 200, 200)' : 'rgb(135, 35, 65)',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '8px',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      cursor: unassignedStudents.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.625rem',
                      justifyContent: 'center',
                      boxShadow: unassignedStudents.length === 0 ? 'none' : '0 2px 8px rgba(135, 35, 65, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      if (unassignedStudents.length > 0) {
                        e.currentTarget.style.background = 'rgb(105, 25, 50)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 35, 65, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (unassignedStudents.length > 0) {
                        e.currentTarget.style.background = 'rgb(135, 35, 65)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(135, 35, 65, 0.3)';
                      }
                    }}
                  >
                    <Shuffle size={16} />
                    Generate Groups
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Student Statistics */}
          <div className="student-statistics">
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-label">Total Students:</span>
                <span className="stat-value">{students.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Assigned to Groups:</span>
                <span className="stat-value">{students.length - unassignedStudents.length}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Unassigned:</span>
                <span className="stat-value">{unassignedStudents.length}</span>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          {showPreview && previewGroups.length > 0 && (
            <div className="preview-section">
              <div className="preview-header">
                <h4>Preview Generated Groups</h4>
                <button 
                  className="btn btn-clear-simple"
                  onClick={clearPreview}
                >
                  Clear Preview
                </button>
              </div>
              <div className="preview-groups-grid">
                {previewGroups.map((group, index) => (
                  <div key={index} className="preview-group-card">
                    <div className="preview-group-header">
                      <h5>{group.groupName}</h5>
                      <span className="member-count">{group.members.length} members</span>
                    </div>
                    <div className="preview-members">
                      {group.members.map((student, memberIndex) => (
                        <div key={student.student_id} className={`preview-member ${memberIndex === 0 ? 'leader' : ''}`}>
                          <div className="preview-member-avatar">
                            {student.profile_image_url ? (
                              <img 
                                src={getImageUrl(student.profile_image_url, student.student_id || student.id)} 
                                alt={`${student.first_name} ${student.last_name}`}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              className="preview-avatar-placeholder"
                              style={{ display: student.profile_image_url ? 'none' : 'flex' }}
                            >
                              {student.first_name?.[0]}{student.last_name?.[0]}
                            </div>
                          </div>
                          <div className="preview-member-info">
                            <span className="preview-member-name">
                              {student.last_name}, {student.first_name}
                            </span>
                            <span className="preview-member-role">
                              {memberIndex === 0 ? 'Leader' : 'Member'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Students Notification */}
          {unassignedStudents.length === 0 && showNoStudentsNotification && (
            <div style={{
              background: 'rgb(135, 35, 65)',
              padding: '1rem 1.5rem',
              borderRadius: '8px',
              marginTop: '1rem',
              boxShadow: 'rgba(135, 35, 65, 0.3) 0px 2px 8px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <span style={{
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.875rem'
                }}>No unassigned students available</span>
                <button 
                  onClick={() => setShowNoStudentsNotification(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

            {groupType === 'manual' && (
              <div style={{
                marginTop: '1.25rem',
                display: 'flex',
                gap: '1.25rem',
                height: '500px'
              }}>
                <div style={{
                  width: '350px',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  <div style={{
                    height: '100%',
                    background: 'rgb(255, 255, 255)',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '2px solid rgb(220, 220, 220)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      padding: '1rem 1.25rem',
                      background: 'white',
                      borderBottom: '2px solid rgb(135, 35, 65)'
                    }}>
                      <h4 style={{
                        margin: '0 0 0.875rem 0',
                        color: 'rgb(135, 35, 65)',
                        fontSize: '1rem',
                        fontWeight: '700'
                      }}>Unassigned Students ({getFilteredStudents().length})</h4>
                    
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}>
                      <input
                        type="text"
                        className="group-creator-search-input-unique"
                        placeholder="Search students..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      
                      <div style={{ 
                        position: 'relative', 
                        display: 'flex',
                        width: '100%'
                      }}>
                        <select 
                          className="group-creator-sort-select-unique"
                          value={sortBy} 
                          onChange={(e) => setSortBy(e.target.value)}
                        >
                          <option value="lastName">Sort by: Last Name</option>
                          <option value="firstName">Sort by: First Name</option>
                          <option value="studentNumber">Sort by: Student Number</option>
                          <option value="program">Sort by: Program</option>
                          <option value="yearLevel">Sort by: Year Level</option>
                          <option value="classPosition">Sort by: Class Position</option>
                        </select>
                      </div>
                    </div>

                    </div>

                    {/* Bulk Operations */}
                    <div style={{
                      display: 'flex',
                      gap: '0.875rem',
                      padding: '1rem',
                      background: 'rgb(15, 25, 50)',
                      borderBottom: '1px solid rgb(60, 70, 100)'
                    }}>
                      <button 
                        onClick={assignAllToGroups}
                        disabled={unassignedStudents.length === 0}
                        style={{
                          padding: '0.6rem 1.5rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: unassignedStudents.length === 0 ? 'rgb(180, 180, 180)' : 'rgb(135, 35, 65)',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          cursor: unassignedStudents.length === 0 ? 'not-allowed' : 'pointer',
                          transition: '0.2s',
                          boxShadow: unassignedStudents.length === 0 ? 'none' : 'rgba(135, 35, 65, 0.3) 0px 2px 8px'
                        }}
                        onMouseEnter={(e) => {
                          if (unassignedStudents.length > 0) {
                            e.currentTarget.style.background = 'rgb(105, 25, 50)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = 'rgba(135, 35, 65, 0.4) 0px 4px 12px';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (unassignedStudents.length > 0) {
                            e.currentTarget.style.background = 'rgb(135, 35, 65)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'rgba(135, 35, 65, 0.3) 0px 2px 8px';
                          }
                        }}
                        onMouseDown={(e) => {
                          if (unassignedStudents.length > 0) {
                            e.currentTarget.style.transform = 'translateY(0)';
                          }
                        }}
                      >
                        Assign All Students
                      </button>
                      <button 
                        onClick={clearAllAssignments}
                        style={{
                          padding: '0.6rem 1.5rem',
                          borderRadius: '6px',
                          border: 'none',
                          background: 'rgb(135, 35, 65)',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          transition: '0.2s',
                          boxShadow: 'rgba(135, 35, 65, 0.3) 0px 2px 8px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgb(105, 25, 50)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = 'rgba(135, 35, 65, 0.4) 0px 4px 12px';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgb(135, 35, 65)';
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'rgba(135, 35, 65, 0.3) 0px 2px 8px';
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        Clear All Assignments
                      </button>
                    </div>
                  
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      padding: '1rem',
                      background: 'white'
                    }}>
                    {getFilteredStudents().map(student => (
                      <div
                        key={student.student_id}
                        className="unique-manual-student-card-item-2024"
                        draggable
                        onDragStart={(e) => handleDragStart(e, student)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          padding: '14px 18px',
                          marginBottom: '12px',
                          background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
                          border: '2px solid rgb(200, 200, 200)',
                          borderRadius: '12px',
                          cursor: 'grab',
                          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                          boxShadow: '0 4px 8px rgba(135, 35, 65, 0.08)',
                          position: 'relative',
                          overflow: 'visible'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-4px)';
                          e.currentTarget.style.boxShadow = '0 12px 24px rgba(135, 35, 65, 0.2)';
                          e.currentTarget.style.borderColor = 'rgb(135, 35, 65)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 4px 8px rgba(135, 35, 65, 0.08)';
                          e.currentTarget.style.borderColor = 'rgb(200, 200, 200)';
                        }}
                        onMouseDown={(e) => {
                          e.currentTarget.style.cursor = 'grabbing';
                        }}
                        onMouseUp={(e) => {
                          e.currentTarget.style.cursor = 'grab';
                        }}
                      >
                        {/* Left accent bar */}
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: 0,
                          height: '100%',
                          width: '5px',
                          background: 'linear-gradient(180deg, rgb(135, 35, 65) 0%, rgb(105, 25, 50) 100%)',
                          borderTopLeftRadius: '10px',
                          borderBottomLeftRadius: '10px'
                        }} />

                        <div style={{
                          width: '52px',
                          height: '52px',
                          borderRadius: '50%',
                          overflow: 'hidden',
                          flexShrink: 0,
                          position: 'relative',
                          background: 'linear-gradient(135deg, rgb(135, 35, 65) 0%, rgb(105, 25, 50) 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '3px solid white',
                          boxShadow: '0 4px 12px rgba(135, 35, 65, 0.3)',
                          transition: 'transform 0.3s ease'
                        }}>
                          {student.profile_image_url ? (
                            <img 
                              src={getImageUrl(student.profile_image_url, student.student_id || student.id)} 
                              alt={`${student.first_name} ${student.last_name}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) {
                                  e.target.nextSibling.style.display = 'flex';
                                }
                              }}
                            />
                          ) : null}
                          <div 
                            style={{ 
                              display: student.profile_image_url ? 'none' : 'flex',
                              width: '100%',
                              height: '100%',
                              background: 'linear-gradient(135deg, rgb(135, 35, 65) 0%, rgb(105, 25, 50) 100%)',
                              color: 'white',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '16px',
                              textTransform: 'uppercase',
                              letterSpacing: '1px'
                            }}
                          >
                            {(student.first_name?.[0] || '')} {(student.last_name?.[0] || '')}
                          </div>
                        </div>
                        
                        <div style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}>
                          <div style={{
                            fontWeight: 700,
                            color: 'rgb(30, 30, 30)',
                            fontSize: '15px',
                            lineHeight: 1.2,
                            margin: 0
                          }}>
                            {student.last_name}, {student.first_name}
                          </div>
                          <div style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '8px',
                            fontSize: '12px'
                          }}>
                            <span style={{
                              fontSize: '11px',
                              color: 'rgb(255, 255, 255)',
                              fontFamily: 'Monaco, Menlo, Courier New, monospace',
                              fontWeight: 600,
                              background: 'linear-gradient(135deg, rgb(135, 35, 65) 0%, rgb(105, 25, 50) 100%)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              display: 'inline-block',
                              boxShadow: '0 2px 4px rgba(135, 35, 65, 0.2)'
                            }}>{student.student_number}</span>
                            {student.program && <span style={{
                              fontSize: '11px',
                              color: 'rgb(135, 35, 65)',
                              fontWeight: 700,
                              background: 'rgba(135, 35, 65, 0.1)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              display: 'inline-block',
                              border: '1.5px solid rgba(135, 35, 65, 0.3)'
                            }}>{student.program}</span>}
                            {student.year_level && <span style={{
                              fontSize: '11px',
                              color: 'rgb(70, 70, 70)',
                              fontWeight: 600,
                              background: 'rgb(240, 240, 240)',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              display: 'inline-block'
                            }}>Year {student.year_level}</span>}
                            {student.class_position && <span style={{
                              fontSize: '10px',
                              color: 'rgb(100, 100, 100)',
                              fontWeight: 500,
                              background: 'rgb(245, 245, 245)',
                              padding: '3px 8px',
                              borderRadius: '4px',
                              display: 'inline-block',
                              textTransform: 'capitalize'
                            }}>{student.class_position}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                      {getFilteredStudents().length === 0 && (
                        <div className="no-students" style={{
                          textAlign: 'center',
                          color: 'rgb(150, 150, 150)',
                          padding: '2rem 1rem',
                          fontSize: '0.938rem',
                          background: 'white'
                        }}>
                          {searchQuery ? 'No students match your search' : 'All students have been assigned'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{
                  flex: 1,
                  overflowY: 'auto'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '1rem'
                  }}>
                  {manualGroups.map((group, index) => (
                    <div key={index} style={{
                      background: 'rgb(20, 30, 60)',
                      border: '1px solid rgb(60, 70, 100)',
                      borderRadius: '8px',
                      padding: '1rem',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgb(135, 35, 65)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 35, 65, 0.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgb(60, 70, 100)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
                    }}>
                      <h4 style={{
                        margin: '0 0 1rem 0',
                        color: 'white',
                        textAlign: 'center',
                        fontSize: '1rem',
                        fontWeight: '700',
                        paddingBottom: '0.75rem',
                        borderBottom: '2px solid rgb(135, 35, 65)'
                      }}>{group.groupName}</h4>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '1rem'
                    }}>
                      {/* Leaders Section */}
                      <div>
                        <h5 style={{
                          margin: '0 0 0.5rem 0',
                          fontSize: '0.813rem',
                          fontWeight: '600',
                          color: 'white',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>Leaders ({group.leaders.length})</h5>
                        <div
                          className="drop-zone leaders"
                          onDrop={(e) => handleDrop(e, index, 'leader')}
                          onDragOver={handleDragOver}
                          style={{
                            minHeight: '120px',
                            border: '2px dashed rgb(135, 35, 65)',
                            borderRadius: '8px',
                            padding: '0.625rem',
                            background: 'rgba(135, 35, 65, 0.03)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease'
                          }}
                        >
                        {group.leaders.map(student => (
                          <div 
                            key={student.student_id} 
                            className="unique-assigned-leader-card-2024"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 12px',
                              marginBottom: '8px',
                              background: 'linear-gradient(135deg, rgba(135, 35, 65, 0.95) 0%, rgba(105, 25, 50, 0.95) 100%)',
                              border: '2px solid rgba(255, 255, 255, 0.3)',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 4px 12px rgba(135, 35, 65, 0.4)',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateX(4px)';
                              e.currentTarget.style.boxShadow = '0 6px 16px rgba(135, 35, 65, 0.5)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateX(0)';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 35, 65, 0.4)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                            }}
                          >
                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              flexShrink: 0,
                              position: 'relative',
                              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 240, 240, 0.9) 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '3px solid white',
                              boxShadow: '0 3px 8px rgba(0, 0, 0, 0.3)'
                            }}>
                              {student.profile_image_url ? (
                                <img 
                                  src={getImageUrl(student.profile_image_url, student.student_id || student.id)} 
                                  alt={`${student.first_name} ${student.last_name}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                  onError={(e) => {
                                    console.error('Image load error for leader:', student);
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) {
                                      e.target.nextSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div 
                                style={{ 
                                  display: student.profile_image_url ? 'none' : 'flex',
                                  width: '100%',
                                  height: '100%',
                                  background: 'linear-gradient(135deg, rgb(135, 35, 65) 0%, rgb(105, 25, 50) 100%)',
                                  color: 'white',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {(student.first_name?.[0] || '')} {(student.last_name?.[0] || '')}
                              </div>
                            </div>
                            <span style={{
                              flex: 1,
                              fontWeight: 700,
                              color: 'white',
                              fontSize: '13px',
                              textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'
                            }}>
                              {student.last_name}, {student.first_name}
                            </span>
                            <button
                              onClick={() => removeStudentFromGroup(student, index, 'leader')}
                              style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: '2px solid rgba(255, 255, 255, 0.4)',
                                color: 'white',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                padding: 0,
                                lineHeight: 1
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                                e.currentTarget.style.color = 'rgb(135, 35, 65)';
                                e.currentTarget.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.transform = 'scale(1)';
                              }}
                              title="Remove from group"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                          {group.leaders.length === 0 && (
                            <p style={{
                              color: 'rgb(150, 150, 150)',
                              fontSize: '0.75rem',
                              fontStyle: 'italic',
                              margin: '0',
                              textAlign: 'center',
                              padding: '0.75rem',
                              border: '1px dashed rgb(80, 90, 120)',
                              borderRadius: '6px',
                              background: 'rgba(135, 35, 65, 0.05)'
                            }}>Drop leaders here</p>
                          )}
                        </div>
                      </div>

                      {/* Members Section */}
                      <div>
                        <h5 style={{
                          margin: '0 0 0.5rem 0',
                          fontSize: '0.813rem',
                          fontWeight: '600',
                          color: 'white',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>Members ({group.members.length})</h5>
                      <div
                        className="drop-zone members"
                        onDrop={(e) => handleDrop(e, index, 'member')}
                        onDragOver={handleDragOver}
                        style={{
                          minHeight: '100px',
                          border: '2px dashed rgb(135, 35, 65)',
                          borderRadius: '8px',
                          padding: '0.625rem',
                          background: 'rgba(135, 35, 65, 0.03)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        {group.members.map(student => (
                          <div 
                            key={student.student_id} 
                            className="unique-assigned-member-card-2024"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '10px 12px',
                              marginBottom: '8px',
                              background: 'linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%)',
                              border: '2px solid rgba(135, 35, 65, 0.3)',
                              borderRadius: '10px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 3px 8px rgba(135, 35, 65, 0.15)',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateX(4px)';
                              e.currentTarget.style.boxShadow = '0 5px 14px rgba(135, 35, 65, 0.25)';
                              e.currentTarget.style.borderColor = 'rgba(135, 35, 65, 0.6)';
                              e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, rgba(135, 35, 65, 0.05) 100%)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateX(0)';
                              e.currentTarget.style.boxShadow = '0 3px 8px rgba(135, 35, 65, 0.15)';
                              e.currentTarget.style.borderColor = 'rgba(135, 35, 65, 0.3)';
                              e.currentTarget.style.background = 'linear-gradient(135deg, #ffffff 0%, #f8f8f8 100%)';
                            }}
                          >
                            {/* Left accent indicator for members */}
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              height: '100%',
                              width: '4px',
                              background: 'linear-gradient(180deg, rgba(135, 35, 65, 0.6) 0%, rgba(135, 35, 65, 0.3) 100%)',
                              borderTopLeftRadius: '8px',
                              borderBottomLeftRadius: '8px'
                            }} />

                            <div style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              flexShrink: 0,
                              position: 'relative',
                              background: 'linear-gradient(135deg, rgb(135, 35, 65) 0%, rgb(105, 25, 50) 100%)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: '3px solid rgba(135, 35, 65, 0.2)',
                              boxShadow: '0 3px 8px rgba(135, 35, 65, 0.25)',
                              transition: 'transform 0.3s ease'
                            }}>
                              {student.profile_image_url ? (
                                <img 
                                  src={getImageUrl(student.profile_image_url, student.student_id || student.id)} 
                                  alt={`${student.first_name} ${student.last_name}`}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover'
                                  }}
                                  onError={(e) => {
                                    console.error('Image load error for member:', student);
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) {
                                      e.target.nextSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              <div 
                                style={{ 
                                  display: student.profile_image_url ? 'none' : 'flex',
                                  width: '100%',
                                  height: '100%',
                                  background: 'linear-gradient(135deg, rgb(135, 35, 65) 0%, rgb(105, 25, 50) 100%)',
                                  color: 'white',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 700,
                                  fontSize: '13px',
                                  textTransform: 'uppercase'
                                }}
                              >
                                {(student.first_name?.[0] || '')} {(student.last_name?.[0] || '')}
                              </div>
                            </div>
                            <span style={{
                              flex: 1,
                              fontWeight: 600,
                              color: 'rgb(40, 40, 40)',
                              fontSize: '13px'
                            }}>
                              {student.last_name}, {student.first_name}
                            </span>
                            <button
                              onClick={() => removeStudentFromGroup(student, index, 'member')}
                              style={{
                                background: 'rgba(135, 35, 65, 0.1)',
                                border: '2px solid rgba(135, 35, 65, 0.3)',
                                color: 'rgb(135, 35, 65)',
                                fontSize: '20px',
                                fontWeight: 'bold',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                padding: 0,
                                lineHeight: 1
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgb(135, 35, 65)';
                                e.currentTarget.style.color = 'white';
                                e.currentTarget.style.transform = 'scale(1.1) rotate(90deg)';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(135, 35, 65, 0.1)';
                                e.currentTarget.style.color = 'rgb(135, 35, 65)';
                                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                              }}
                              title="Remove from group"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {group.members.length === 0 && (
                          <p style={{
                            color: 'rgb(150, 150, 150)',
                            fontSize: '0.75rem',
                            fontStyle: 'italic',
                            margin: '0',
                            textAlign: 'center',
                            padding: '0.75rem',
                            border: '1px dashed rgb(80, 90, 120)',
                            borderRadius: '6px',
                            background: 'rgba(135, 35, 65, 0.05)'
                          }}>Drop members here</p>
                        )}
                      </div>
                    </div>
                    </div>
                  </div>
                  ))}
                  </div>
                </div>
              </div>
            )}
        </div>

        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '2px solid white',
          background: 'rgb(9, 18, 44)',
          display: 'flex',
          justifyContent: 'space-between',
          gap: '1rem'
        }}>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              border: '2px solid rgb(135, 35, 65)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.625rem',
              fontSize: '0.938rem',
              transition: 'all 0.2s ease',
              background: 'white',
              color: 'rgb(135, 35, 65)',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgb(135, 35, 65)';
                e.currentTarget.style.color = 'white';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 35, 65, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.color = 'rgb(135, 35, 65)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCreateGroups}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.625rem',
              fontSize: '0.938rem',
              transition: 'all 0.2s ease',
              background: 'rgb(135, 35, 65)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgb(105, 25, 50)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(135, 35, 65, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.background = 'rgb(135, 35, 65)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            {loading ? 'Creating...' : 'Create Groups'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay,
        .modal-overlay-landing {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
        }

        .group-creator-modal {
          width: 92%;
          max-width: 980px;
          max-height: 86vh;
          position: relative;
          background: rgba(9, 18, 44, 0.15);
          border: 0.1px solid rgb(95, 95, 95);
          border-radius: 0px;
          box-shadow: rgba(0, 0, 0, 0.5) 0px 4px 12px;
          backdrop-filter: blur(3.2px) saturate(120%);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 1.5rem;
          border-bottom: 2px solid rgb(135, 35, 65);
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgb(255, 255, 255);
        }

        .modal-header h3 {
          margin: 0;
          color: rgb(135, 35, 65);
          font-weight: 700;
          font-size: 1.25rem;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          color: rgb(135, 35, 65);
          transition: all 0.2s ease;
        }

        .close-button:hover { 
          background: rgba(135, 35, 65, 0.1);
          transform: rotate(90deg);
        }

        .modal-body {
          padding: 1.5rem;
          flex: 1;
          overflow-y: auto;
          background: rgb(255, 255, 255);
        }

        .error-alert {
          background: #FEE2E2;
          border: 1px solid rgb(135, 35, 65);
          color: rgb(135, 35, 65);
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.25rem;
          font-weight: 500;
        }

        .group-type-selector {
          display: flex;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
          justify-content: center;
        }

        .group-type-selector label {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          padding: 0.875rem 1.25rem;
          border: 2px solid rgb(230, 230, 230);
          border-radius: 8px;
          background: rgb(255, 255, 255);
          transition: all 0.2s ease;
          font-weight: 500;
          color: rgb(80, 80, 80);
        }

        .group-type-selector label:hover {
          border-color: rgb(135, 35, 65);
          background: rgba(135, 35, 65, 0.05);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.15);
        }

        .group-type-selector label:has(input:checked) {
          border-color: rgb(135, 35, 65);
          background: rgba(135, 35, 65, 0.1);
          color: rgb(135, 35, 65);
        }

        .group-type-selector input[type="radio"] {
          margin: 0;
        }

        .group-settings {
          margin-bottom: 1.25rem;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgb(60, 70, 100);
        }

        .settings-row {
          display: flex;
          gap: 1.25rem;
          align-items: end;
          flex-wrap: wrap;
        }

        .setting-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          min-width: 150px;
        }

        .setting-group label {
          font-weight: 600;
          font-size: 0.875rem;
          color: white;
        }

        .setting-group input {
          padding: 0.625rem 0.875rem;
          border: 1px solid rgb(60, 70, 100);
          border-radius: 6px;
          width: 100%;
          font-size: 0.875rem;
          transition: all 0.2s ease;
          background: rgb(20, 30, 60);
          color: white;
        }

        .setting-group input:focus {
          outline: none;
          border-color: rgb(135, 35, 65);
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.1);
        }

        .manual-assignment {
          margin-top: 20px;
          display: flex;
          gap: 20px;
          height: 500px;
        }

        .left-panel {
          width: 350px;
          flex-shrink: 0;
        }

        .right-panel {
          flex: 1;
          overflow-y: auto;
        }

        .unassigned-students {
          height: 100%;
          background: rgb(255, 255, 255);
          border-radius: 0px;
          display: flex;
          flex-direction: column;
          border: 1px solid rgb(230, 230, 230);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .students-header { 
          padding: 1rem 1.25rem; 
          border-bottom: 2px solid rgb(135, 35, 65);
          background: rgb(255, 255, 255);
        }

        .students-header h4 { 
          margin: 0 0 0.875rem 0; 
          color: rgb(135, 35, 65); 
          font-size: 1rem; 
          font-weight: 700; 
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 0.875rem;
          border: 1px solid rgb(220, 220, 220);
          border-radius: 6px;
          font-size: 0.875rem;
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: rgb(135, 35, 65);
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.1);
        }

        .sort-controls {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }

        .sort-controls label {
          font-size: 0.813rem;
          color: rgb(120, 120, 120);
          white-space: nowrap;
          font-weight: 500;
        }

        .sort-select {
          flex: 1;
          padding: 0.5rem 0.625rem;
          border: 1px solid rgb(220, 220, 220);
          border-radius: 6px;
          font-size: 0.813rem;
          background: white;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .sort-select:focus {
          outline: none;
          border-color: rgb(135, 35, 65);
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.1);
        }

        .students-list { 
          flex: 1; 
        .student-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          margin-bottom: 0.75rem;
          background: white;
          border: 2px solid rgb(220, 220, 220);
          border-radius: 10px;
          cursor: grab;
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          position: relative;
          overflow: hidden;
        }

        .student-item::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          width: 4px;
          background: rgb(135, 35, 65);
          transform: scaleY(0);
          transition: transform 0.2s ease;
        }

        .student-item:hover {
          background: rgb(255, 255, 255);
          border-color: rgb(135, 35, 65);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(135, 35, 65, 0.15);
        }

        .student-item:hover::before {
          transform: scaleY(1);
        }

        .student-item:active {
          cursor: grabbing;
          transform: translateY(1px);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.2);
        }

        .student-item.dragging {
          opacity: 0.7;
          transform: rotate(2deg) scale(0.98);
        }

        .student-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          position: relative;
          background: rgb(135, 35, 65);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid rgb(135, 35, 65);
          box-shadow: 0 3px 10px rgba(135, 35, 65, 0.3);
          transition: transform 0.2s ease;
        }

        .student-item:hover .student-avatar {
          transform: scale(1.1);
          box-shadow: 0 4px 14px rgba(135, 35, 65, 0.4);
        }

        .student-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 100%;
          height: 100%;
          background: rgb(135, 35, 65);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
          text-transform: uppercase;
        }

        .student-details {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .student-name {
          font-weight: 700;
          color: rgb(40, 40, 40);
          font-size: 14px;
          line-height: 1.3;
          margin: 0;
        }

        .student-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 12px;
        }

        .student-number {
          font-size: 11px;
          color: rgb(100, 100, 100);
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-weight: 500;
          background: rgb(245, 245, 245);
          padding: 2px 6px;
          border-radius: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .student-program {
          font-size: 11px;
          color: rgb(110, 110, 110);
          font-weight: 600;
          background: rgb(245, 245, 245);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .student-year {
          font-size: 11px;
          color: rgb(110, 110, 110);
          font-weight: 500;
        }

        .student-position {
          font-size: 10px;
          color: rgb(140, 140, 140);
          text-transform: capitalize;
        }

        /* Group Templates */
        .group-templates { 
          margin-bottom: 1.25rem; 
          padding: 1.25rem; 
          background: rgb(250, 250, 250); 
          border-radius: 8px; 
          border: 1px solid rgb(230, 230, 230); 
        }

        .group-templates h4 {
          margin: 0 0 1rem 0;
          color: rgb(135, 35, 65);
          font-size: 1rem;
          font-weight: 700;
        }

        .template-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.875rem;
        }

        .template-card {
          padding: 1rem;
          border: 2px solid rgb(230, 230, 230);
          border-radius: 8px;
          background: rgb(255, 255, 255);
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .template-card h5 {
          margin: 0 0 0.5rem 0;
          color: rgb(135, 35, 65);
          font-size: 0.938rem;
          font-weight: 600;
        }

        .template-card p {
          margin: 0.125rem 0;
          font-size: 0.813rem;
          color: rgb(120, 120, 120);
        }

        /* Student Statistics */
        .student-statistics {
          margin-bottom: 1.5rem;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgb(60, 70, 100);
        }

        .student-statistics h4 {
          margin: 0 0 1rem 0;
          color: white;
          font-size: 1rem;
          font-weight: 700;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 1rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem;
          background: transparent;
          border-radius: 8px;
          border: none;
          box-shadow: none;
          transition: all 0.2s ease;
        }

        .stat-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.25);
          border-color: transparent;
        }

        .stat-label {
          font-size: 0.75rem;
          color: rgb(150, 150, 150);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: rgb(135, 35, 65);
        }

        .btn-generate-simple {
          background: rgb(135, 35, 65);
          color: white;
          border: none;
          padding: 0.625rem 1.25rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(135, 35, 65, 0.3);
        }

        .btn-generate-simple:hover:not(:disabled) {
          background: rgb(105, 25, 50);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.4);
        }

        .btn-generate-simple:disabled {
          background: rgb(200, 200, 200);
          color: rgb(150, 150, 150);
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .generate-button-group {
          margin-center: auto;
          min-width: 200px;
        }
        
        .btn-clear-simple {
          background: white;
          color: rgb(135, 35, 65);
          border: 2px solid rgb(135, 35, 65);
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.813rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-clear-simple:hover {
          background: rgb(135, 35, 65);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.3);
        }

        /* Preview Section */
        .preview-section { 
          margin-bottom: 1.25rem; 
        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .preview-section h4 {
          margin: 0;
          color: white;
          font-size: 1rem;
          font-weight: 700;
        }

        .preview-groups-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1rem;
        }

        .preview-group-card {
          background: rgb(20, 30, 60);
          border: 1px solid rgb(60, 70, 100);
          border-radius: 8px;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          transition: all 0.2s ease;
        }

        .preview-group-card:hover {
          border-color: rgb(135, 35, 65);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.25);
          transform: translateY(-2px);
        }

        .preview-group-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.875rem;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid rgb(135, 35, 65);
        }

        .preview-group-header h5 {
          margin: 0;
          color: white;
          font-size: 1rem;
          font-weight: 700;
        }

        .member-count {
          background: rgba(135, 35, 65, 0.1);
          color: rgb(135, 35, 65);
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .preview-member { 
          display: flex; 
          align-items: center; 
          gap: 0.875rem; 
          padding: 0.625rem; 
          background: rgb(15, 25, 50); 
          border-radius: 8px; 
          border: 1px solid rgb(60, 70, 100);
          transition: all 0.2s ease;
        }

        .preview-member:hover {
          background: rgb(20, 35, 60);
          border-color: rgb(135, 35, 65);
        }

        .preview-member.leader {
          background: rgba(135, 35, 65, 0.1);
          border-color: rgb(135, 35, 65);
          border-left: 4px solid rgb(135, 35, 65);
        }

        .preview-member.leader {
          background: #f9fafb;
          border-color: #d1d5db;
        }

        .preview-member-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }

        .preview-member-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .preview-avatar-placeholder {
          width: 100%;
          height: 100%;
          background: #6366f1;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
        }

        .preview-member-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .preview-member-name {
          font-size: 14px;
          font-weight: 500;
          color: white;
        }

        .preview-member-role {
          font-size: 12px;
          color: rgb(150, 150, 150);
          font-weight: 500;
        }

        /* No Students Notification */
        .no-students-notification {
          margin-bottom: 20px;
          padding: 12px 16px;
          background: #fef3c7;
          border: 1px solid #f59e0b;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .notification-content {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .notification-content span {
          color: #92400e;
          font-weight: 500;
        }

        .notification-close {
          background: none;
          border: none;
        /* Bulk Operations */
        .bulk-operations { 
          display: flex; 
          gap: 0.875rem; 
          margin-bottom: 1rem; 
          padding: 1rem; 
          background: rgb(250, 250, 250); 
          border-radius: 8px; 
          border: 1px solid rgb(230, 230, 230); 
        }

        .bulk-btn {
          flex: 1;
          padding: 0.625rem 1rem;
          border: 2px solid rgb(135, 35, 65);
          border-radius: 6px;
          background: white;
          font-size: 0.813rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          justify-content: center;
          color: rgb(135, 35, 65);
        }

        .bulk-btn:hover:not(:disabled) {
          background: rgb(135, 35, 65);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.3);
        }

        .bulk-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          border-color: rgb(200, 200, 200);
          color: rgb(150, 150, 150);
        }

        .bulk-btn.assign-all {
          background: rgb(135, 35, 65);
          color: white;
        }

        .bulk-btn.assign-all:hover:not(:disabled) {
          background: rgb(105, 25, 50);
        }

        .bulk-btn.clear-all {
          background: white;
        } align-items: center;
          gap: 6px;
        }
        .group-assignment-card { 
          background: rgb(255, 255, 255); 
          border: 1px solid rgb(230, 230, 230); 
          border-radius: 8px; 
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: all 0.2s ease;
        }

        .group-assignment-card:hover {
          border-color: rgb(135, 35, 65);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.15);
        }

        .group-assignment-card h4 {
          margin: 0 0 1rem 0;
          color: rgb(135, 35, 65);
          text-align: center;
          font-size: 1rem;
          font-weight: 700;
          padding-bottom: 0.75rem;
          border-bottom: 2px solid rgb(135, 35, 65);
        }bulk-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        .drop-zone { 
          min-height: 80px; 
          border: 2px dashed rgb(200, 200, 200); 
          border-radius: 8px; 
          padding: 0.625rem; 
          background: rgb(250, 250, 250); 
          display: flex; 
          flex-direction: column; 
          gap: 0.5rem; 
          transition: all 0.2s ease;
        }

        .drop-zone:hover, 
        .drop-zone.drag-over { 
          border-color: rgb(135, 35, 65); 
          background: rgba(135, 35, 65, 0.05);
        }

        .drop-zone.leaders {
          border-color: rgb(135, 35, 65);
          background: rgba(135, 35, 65, 0.03);
        }

        .drop-zone.leaders:hover,
        .drop-zone.leaders.drag-over {
          border-color: rgb(105, 25, 50);
          background: rgba(135, 35, 65, 0.08);
        } color: #9ca3af;
          font-style: italic;
        }
        .assigned-student-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 0.875rem;
          background: white;
          border: 2px solid rgb(230, 230, 230);
          border-radius: 8px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .assigned-student-item:hover {
          background: rgb(255, 255, 255);
          border-color: rgb(135, 35, 65);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.2);
          transform: translateY(-1px);
        }

        .assigned-student-item.leader {
          border-left: 4px solid rgb(255, 152, 0);
          background: rgba(255, 152, 0, 0.02);
        }

        .assigned-student-item.leader:hover {
          border-left: 4px solid rgb(255, 152, 0);
          background: rgba(255, 152, 0, 0.05);
        }

        .assigned-student-item.member {
          border-left: 4px solid rgb(76, 175, 80);
          background: rgba(76, 175, 80, 0.02);
        }

        .assigned-student-item.member:hover {
          border-left: 4px solid rgb(76, 175, 80);
          background: rgba(76, 175, 80, 0.05);
        }

        .student-avatar-small {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
          position: relative;
          background: rgb(135, 35, 65);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .student-avatar-small img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder-small {
          width: 100%;
          height: 100%;
          background: rgb(135, 35, 65);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
        }

        .assigned-student-name {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
          color: rgb(50, 50, 50);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .remove-student {
          background: none;
          border: none;
          color: rgb(200, 50, 50);
          font-size: 1.25rem;
          font-weight: bold;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .remove-student:hover {
          background: rgb(255, 240, 240);
          color: rgb(220, 50, 50);
        }

        .group-section h5 {
          margin: 0 0 8px 0;
          font-size: 13px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .drop-zone { 
          min-height: 120px; 
          border: 2px dashed rgb(220, 220, 220); 
          border-radius: 10px; 
          padding: 1rem 0.875rem; 
          background: rgb(248, 250, 252);
          display: flex; 
          flex-direction: column; 
          gap: 0.75rem; 
          transition: all 0.3s ease;
        }

        .drop-zone:hover, .drop-zone.drag-over { 
          border-color: rgb(135, 35, 65);
          background: rgba(135, 35, 65, 0.03);
        }

        .drop-zone.leaders {
          border-color: rgb(255, 152, 0);
          background: rgba(255, 152, 0, 0.02);
        }

        .drop-zone.leaders:hover,
        .drop-zone.leaders.drag-over {
          border-color: rgb(255, 152, 0);
          background: rgba(255, 152, 0, 0.08);
          box-shadow: 0 4px 12px rgba(255, 152, 0, 0.15);
        }

        .drop-zone.members {
          border-color: rgb(76, 175, 80);
          background: rgba(76, 175, 80, 0.02);
        }

        .drop-zone.members:hover,
        .drop-zone.members.drag-over {
          border-color: rgb(76, 175, 80);
          background: rgba(76, 175, 80, 0.08);
          box-shadow: 0 4px 12px rgba(76, 175, 80, 0.15);
        }
        .drop-hint {
          color: rgb(150, 150, 150);
          font-size: 0.813rem;
          font-style: italic;
          margin: 0.5rem 0;
          text-align: center;
          padding: 1rem;
          border: 2px dashed rgb(220, 220, 220);
          border-radius: 8px;
          background: rgb(248, 250, 252);
        }

        .modal-footer { 
          padding: 1rem 1.5rem; 
          border-top: 2px solid rgb(135, 35, 65); 
          background: rgb(255, 255, 255);
        }
          background: #6366f1;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 10px;
          text-transform: uppercase;
        }

        .assigned-student-name {
          flex: 1;
          font-size: 13px;
          color: rgb(200, 200, 200);
          font-weight: 500;
        }

        .remove-student {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 50%;
        .btn { 
          padding: 0.75rem 1.5rem; 
          border-radius: 6px; 
          font-weight: 700; 
          cursor: pointer; 
          border: none; 
          display: inline-flex; 
          align-items: center; 
          gap: 0.625rem; 
          font-size: 0.938rem; 
          transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          box-shadow: none;
        }

        .btn-secondary { 
          background: white; 
          color: rgb(135, 35, 65); 
          border: 2px solid rgb(135, 35, 65);
          box-shadow: none;
        }
        
        .btn-secondary:hover:not(:disabled) { 
          background: rgb(135, 35, 65);
          color: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.3);
        }

        .btn-primary { 
          background: rgb(135, 35, 65); 
          color: white;
        }
        
        .btn-primary:hover:not(:disabled) { 
          background: rgb(105, 25, 50);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.4);
        }
          background: #dc2626;
        }

        .drop-hint {
          color: #9ca3af;
          font-size: 12px;
          font-style: italic;
          margin: 8px 0;
          text-align: center;
          padding: 16px;
          border: 1px dashed #d1d5db;
          border-radius: 4px;
          background: #f9fafb;
        }

        .modal-footer { padding: 12px 16px; border-top: 2px solid #EBE5C2; background: #F8F3D9; }

        .footer-buttons {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .btn { padding: 10px 16px; border-radius: 8px; font-weight: 700; cursor: pointer; border: 2px solid transparent; display: inline-flex; align-items: center; gap: 8px; font-size: 14px; transition: all 0.2s; }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary { background: #FFFFFF; color: #504B38; border-color: #B9B28A; }
        .btn-secondary:hover:not(:disabled) { background: #F8F3D9; }

        .btn-primary { background: #B9B28A; color: #FFFFFF; border-color: #B9B28A; }
        .btn-primary:hover:not(:disabled) { background: #504B38; border-color: #504B38; }

        /* UNIQUE OVERRIDES FOR SEARCH AND SORT - ULTRA MAXIMUM SPECIFICITY */
        /* These rules MUST override the global input[type="text"] and select rules */
        
        div input.group-creator-search-input-unique.group-creator-search-input-unique,
        div input.group-creator-search-input-unique.group-creator-search-input-unique[type="text"],
        input.group-creator-search-input-unique.group-creator-search-input-unique,
        input.group-creator-search-input-unique.group-creator-search-input-unique[type="text"] {
          width: 100% !important;
          padding: 0.75rem 1rem !important;
          border-radius: 8px !important;
          border: 2px solid rgb(135, 35, 65) !important;
          background: white !important;
          background-color: white !important;
          color: rgb(50, 50, 50) !important;
          font-weight: 500 !important;
          font-size: 0.875rem !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 8px rgba(135, 35, 65, 0.15) !important;
          outline: none !important;
          box-sizing: border-box !important;
        }

        div input.group-creator-search-input-unique.group-creator-search-input-unique:focus,
        div input.group-creator-search-input-unique.group-creator-search-input-unique[type="text"]:focus,
        input.group-creator-search-input-unique.group-creator-search-input-unique:focus,
        input.group-creator-search-input-unique.group-creator-search-input-unique[type="text"]:focus {
          border: 2px solid rgb(135, 35, 65) !important;
          box-shadow: 0 0 0 4px rgba(135, 35, 65, 0.2) !important;
          background: rgb(255, 252, 253) !important;
          background-color: rgb(255, 252, 253) !important;
          color: rgb(50, 50, 50) !important;
        }

        div input.group-creator-search-input-unique.group-creator-search-input-unique::placeholder,
        input.group-creator-search-input-unique.group-creator-search-input-unique::placeholder {
          color: rgb(150, 150, 150) !important;
          opacity: 1 !important;
        }

        div select.group-creator-sort-select-unique.group-creator-sort-select-unique,
        select.group-creator-sort-select-unique.group-creator-sort-select-unique {
          width: 100% !important;
          padding: 0.75rem 2.5rem 0.75rem 1rem !important;
          border-radius: 8px !important;
          border: 2px solid rgb(135, 35, 65) !important;
          background: white !important;
          background-color: white !important;
          color: rgb(50, 50, 50) !important;
          font-weight: 500 !important;
          font-size: 0.875rem !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          box-shadow: 0 2px 8px rgba(135, 35, 65, 0.15) !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
          outline: none !important;
          box-sizing: border-box !important;
        }

        div select.group-creator-sort-select-unique.group-creator-sort-select-unique:hover,
        select.group-creator-sort-select-unique.group-creator-sort-select-unique:hover {
          border: 2px solid rgb(105, 25, 50) !important;
          box-shadow: 0 0 0 4px rgba(135, 35, 65, 0.2) !important;
          background: rgb(255, 252, 253) !important;
          background-color: rgb(255, 252, 253) !important;
          color: rgb(50, 50, 50) !important;
        }

        div select.group-creator-sort-select-unique.group-creator-sort-select-unique:focus,
        select.group-creator-sort-select-unique.group-creator-sort-select-unique:focus {
          background: white !important;
          background-color: white !important;
          color: rgb(50, 50, 50) !important;
          border: 2px solid rgb(135, 35, 65) !important;
        }

        div select.group-creator-sort-select-unique.group-creator-sort-select-unique option,
        select.group-creator-sort-select-unique.group-creator-sort-select-unique option {
          background: white !important;
          background-color: white !important;
          color: rgb(50, 50, 50) !important;
          padding: 0.5rem !important;
        }
      `}</style>
    </div>
  );
};

export default SimplifiedGroupCreator;