import React, { useState, useEffect } from 'react';
import { X, Calendar, AlertTriangle, Plus, Trash2, AlertCircle, CheckCircle, Settings, Layers } from 'lucide-react';

const EditProjectModal = ({ project, onClose, onUpdateProject, onUpdatePhase }) => {
  // File type categories
  const fileTypeCategories = {
    'Documents': ['pdf', 'doc', 'docx', 'txt', 'rtf', 'odt'],
    'Images': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'],
    'Videos': ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'],
    'Audio': ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
    'Archives': ['zip', 'rar', '7z', 'tar', 'gz'],
    'Programming': ['js', 'ts', 'html', 'css', 'py', 'java', 'cpp', 'c', 'php', 'rb', 'go', 'rs'],
    'Data': ['csv', 'json', 'xml', 'sql', 'xlsx', 'xls'],
    'Presentations': ['ppt', 'pptx', 'odp'],
    'Other': ['exe', 'dmg', 'iso', 'bin']
  };

  // Helper function to format date for datetime-local input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [projectData, setProjectData] = useState({
    title: project.title || '',
    description: project.description || '',
    start_date: project.start_date ? formatDateForInput(project.start_date) : '',
    due_date: project.due_date ? formatDateForInput(project.due_date) : '',
    file_types_allowed: Array.isArray(project.file_types_allowed) ? project.file_types_allowed : [],
    max_file_size_mb: project.max_file_size_mb || 10,
    min_tasks_per_member: project.min_tasks_per_member || 1,
    max_tasks_per_member: project.max_tasks_per_member || 5,
    breathe_phase_days: project.breathe_phase_days || 0,
    project_rubric_type: project.project_rubric_type || 'builtin',
    project_evaluation_type: project.evaluation_form_type || 'builtin',
    project_evaluation_deadline: project.project_evaluation_deadline ? formatDateForInput(project.project_evaluation_deadline) : ''
  });
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPhaseCategory, setSelectedPhaseCategory] = useState({});
  const [activeSection, setActiveSection] = useState('project');
  const [expandedPhases, setExpandedPhases] = useState({});
  const [expandedRubrics, setExpandedRubrics] = useState({});
  const [expandedEvaluations, setExpandedEvaluations] = useState({});
  const [expandedProjectRubric, setExpandedProjectRubric] = useState(true);
  const [expandedProjectEvaluation, setExpandedProjectEvaluation] = useState(true);
  const [expandedProjectSettings, setExpandedProjectSettings] = useState(true);
  
  // Project rubric and evaluation form states
  const [projectRubric, setProjectRubric] = useState({
    instructions: 'Use this rubric to evaluate student work.',
    totalPoints: 100,
    criteria: [
      { name: 'Quality', description: 'Overall quality of the work', maxPoints: 50 },
      { name: 'Completeness', description: 'How complete the work is', maxPoints: 50 }
    ]
  });
  
  const [builtInEvaluation, setBuiltInEvaluation] = useState({
    instructions: 'Rate your groupmates according to the following criteria.',
    totalPoints: 100,
    criteria: [
      { name: 'Collaboration', description: 'How well they collaborated', maxPoints: 50 },
      { name: 'Contribution', description: 'Their contribution to the project', maxPoints: 50 }
    ]
  });

  const handleSetSelectedPhaseCategory = (phaseIndex, category) => {
    setSelectedPhaseCategory(prev => ({
      ...prev,
      [phaseIndex]: category
    }));
  };

  const togglePhaseExpansion = (phaseIndex) => {
    setExpandedPhases(prev => ({
      ...prev,
      [phaseIndex]: !prev[phaseIndex]
    }));
  };

  const toggleRubricExpansion = (phaseIndex) => {
    setExpandedRubrics(prev => ({
      ...prev,
      [phaseIndex]: !prev[phaseIndex]
    }));
  };

  const toggleEvaluationExpansion = (phaseIndex) => {
    setExpandedEvaluations(prev => ({
      ...prev,
      [phaseIndex]: !prev[phaseIndex]
    }));
  };

  const toggleProjectRubricExpansion = () => {
    setExpandedProjectRubric(prev => !prev);
  };

  const toggleProjectEvaluationExpansion = () => {
    setExpandedProjectEvaluation(prev => !prev);
  };

  const toggleProjectSettingsExpansion = () => {
    setExpandedProjectSettings(prev => !prev);
  };

  useEffect(() => {
    // Initialize phases from project
    console.log('EditProjectModal - Project data:', project);
    console.log('EditProjectModal - Project phases:', project.project_phases);
    
    if (project.project_phases && Array.isArray(project.project_phases) && project.project_phases.length > 0) {
      const sortedPhases = [...project.project_phases].sort((a, b) => a.phase_number - b.phase_number).map(phase => ({
        ...phase,
        title: phase.title || '',
        description: phase.description || '',
        start_date: phase.start_date ? formatDateForInput(phase.start_date) : '',
        end_date: phase.end_date ? formatDateForInput(phase.end_date) : '',
        file_types_allowed: Array.isArray(phase.file_types_allowed) ? phase.file_types_allowed : [],
        max_attempts: phase.max_attempts || 1,
        evaluation_form_type: phase.evaluation_form_type || 'builtin',
        rubricType: phase.rubricType || 'builtin',
        rubric: phase.rubric || {
          instructions: 'Use this rubric to evaluate student work for this phase.',
          totalPoints: 100,
          criteria: [
            { name: 'Quality', description: 'Overall quality of the work', maxPoints: 50 },
            { name: 'Completeness', description: 'How complete the work is', maxPoints: 50 }
          ]
        },
        builtInEvaluation: phase.builtInEvaluation || {
          instructions: 'Rate your groupmates according to the following criteria.',
          totalPoints: 100,
          criteria: [
            { name: 'Collaboration', description: 'How well they collaborated', maxPoints: 50 },
            { name: 'Contribution', description: 'Their contribution to the project', maxPoints: 50 }
          ]
        }
      }));
      console.log('EditProjectModal - Setting sorted phases:', sortedPhases);
      setPhases(sortedPhases);
    } else {
      console.log('EditProjectModal - No phases found or empty array');
    }
  }, [project]);

  const handleProjectChange = (field, value) => {
    setProjectData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleFileTypesChange = (selectedTypes) => {
    setProjectData(prev => ({
      ...prev,
      file_types_allowed: selectedTypes
    }));
  };

  const handlePhaseChange = (phaseIndex, field, value) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          [field]: value
        };
      }
      return phase;
    }));
  };

  const handlePhaseFileTypesChange = (phaseIndex, selectedTypes) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          file_types_allowed: selectedTypes
        };
      }
      return phase;
    }));
  };

  // Project rubric functions
  const addProjectRubricCriterion = () => {
    setProjectRubric(prev => ({
      ...prev,
      criteria: [...prev.criteria, { name: '', description: '', maxPoints: 0 }]
    }));
  };

  const updateProjectRubricCriterion = (index, field, value) => {
    setProjectRubric(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, i) => 
        i === index ? { ...criterion, [field]: value } : criterion
      )
    }));
  };

  const removeProjectRubricCriterion = (index) => {
    setProjectRubric(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index)
    }));
  };

  // Project evaluation functions
  const addProjectEvaluationCriterion = () => {
    setBuiltInEvaluation(prev => ({
      ...prev,
      criteria: [...prev.criteria, { name: '', description: '', maxPoints: 0 }]
    }));
  };

  const updateProjectEvaluationCriterion = (index, field, value) => {
    setBuiltInEvaluation(prev => ({
      ...prev,
      criteria: prev.criteria.map((criterion, i) => 
        i === index ? { ...criterion, [field]: value } : criterion
      )
    }));
  };

  const removeProjectEvaluationCriterion = (index) => {
    setBuiltInEvaluation(prev => ({
      ...prev,
      criteria: prev.criteria.filter((_, i) => i !== index)
    }));
  };

  // Phase rubric functions
  const addPhaseRubricCriterion = (phaseIndex) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          rubric: {
            ...phase.rubric,
            criteria: [...phase.rubric.criteria, { name: '', description: '', maxPoints: 0 }]
          }
        };
      }
      return phase;
    }));
  };

  const updatePhaseRubricCriterion = (phaseIndex, criterionIndex, field, value) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          rubric: {
            ...phase.rubric,
            criteria: phase.rubric.criteria.map((criterion, i) => 
              i === criterionIndex ? { ...criterion, [field]: value } : criterion
            )
          }
        };
      }
      return phase;
    }));
  };

  const removePhaseRubricCriterion = (phaseIndex, criterionIndex) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          rubric: {
            ...phase.rubric,
            criteria: phase.rubric.criteria.filter((_, i) => i !== criterionIndex)
          }
        };
      }
      return phase;
    }));
  };

  // Phase evaluation functions
  const addPhaseEvaluationCriterion = (phaseIndex) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          builtInEvaluation: {
            ...phase.builtInEvaluation,
            criteria: [...phase.builtInEvaluation.criteria, { name: '', description: '', maxPoints: 0 }]
          }
        };
      }
      return phase;
    }));
  };

  const updatePhaseEvaluationCriterion = (phaseIndex, criterionIndex, field, value) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          builtInEvaluation: {
            ...phase.builtInEvaluation,
            criteria: phase.builtInEvaluation.criteria.map((criterion, i) => 
              i === criterionIndex ? { ...criterion, [field]: value } : criterion
            )
          }
        };
      }
      return phase;
    }));
  };

  const removePhaseEvaluationCriterion = (phaseIndex, criterionIndex) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          builtInEvaluation: {
            ...phase.builtInEvaluation,
            criteria: phase.builtInEvaluation.criteria.filter((_, i) => i !== criterionIndex)
          }
        };
      }
      return phase;
    }));
  };

  const validateProjectDates = () => {
    const newErrors = {};
    
    if (projectData.start_date) {
      const startDate = new Date(projectData.start_date);
      const now = new Date();
      
      if (startDate < now) {
        newErrors.start_date = 'Project start date cannot be in the past';
      }
    }
    
    if (projectData.due_date) {
      const dueDate = new Date(projectData.due_date);
      const now = new Date();
      
      if (dueDate < now) {
        newErrors.due_date = 'Project deadline cannot be in the past';
      }
    }

    if (projectData.start_date && projectData.due_date) {
      const startDate = new Date(projectData.start_date);
      const dueDate = new Date(projectData.due_date);
      
      if (dueDate <= startDate) {
        newErrors.due_date = 'Due date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validatePhaseDates = () => {
    const newErrors = {};
    
    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const phaseKey = `phase_${i}`;
      
      if (phase.start_date && phase.end_date) {
        const startDate = new Date(phase.start_date);
        const endDate = new Date(phase.end_date);
        
        if (endDate <= startDate) {
          newErrors[`${phaseKey}_end_date`] = 'End date must be after start date';
        }
        
        // Check if dates are in the past
        const now = new Date();
        if (startDate < now) {
          newErrors[`${phaseKey}_start_date`] = 'Start date cannot be in the past';
        }
        if (endDate < now) {
          newErrors[`${phaseKey}_end_date`] = 'End date cannot be in the past';
        }
      }
      
      // Check sequential validation
      if (i > 0) {
        const prevPhase = phases[i - 1];
        if (phase.start_date && prevPhase.end_date) {
          const currentStart = new Date(phase.start_date);
          const prevEnd = new Date(prevPhase.end_date);
          
          if (currentStart < prevEnd) {
            newErrors[`${phaseKey}_start_date`] = `Start date must be after Phase ${prevPhase.phase_number} end date`;
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateProjectDates() || !validatePhaseDates()) {
      return;
    }

    setLoading(true);
    
    try {
      // Update project if any field changed
      const hasProjectChanges = Object.keys(projectData).some(key => {
        if (key === 'due_date') {
          const originalDueDate = project.due_date ? formatDateForInput(project.due_date) : '';
          return projectData[key] !== originalDueDate;
        }
        return projectData[key] !== project[key];
      });

      if (hasProjectChanges) {
        await onUpdateProject(projectData);
      }

      // Update phases that have changes
      for (const phase of phases) {
        const originalPhase = project.project_phases.find(p => p.id === phase.id);
        if (originalPhase) {
          const updates = {};
          
          // Check all fields for changes
          const fieldsToCheck = ['title', 'description', 'start_date', 'end_date', 'file_types_allowed', 'max_attempts', 'evaluation_form_type'];
          
          fieldsToCheck.forEach(field => {
            if (field === 'start_date' || field === 'end_date') {
              const originalValue = originalPhase[field] ? formatDateForInput(originalPhase[field]) : '';
              if (phase[field] !== originalValue) {
                updates[field] = phase[field];
              }
            } else if (phase[field] !== originalPhase[field]) {
              updates[field] = phase[field];
            }
          });
        
          if (Object.keys(updates).length > 0) {
            await onUpdatePhase(phase.id, updates);
          }
        }
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving changes:', error);
    } finally {
      setLoading(false);
    }
  };

  const canEditPhase = (phaseIndex) => {
    // Phase 1 can always be edited
    if (phaseIndex === 0) return true;
    
    // Check if all previous phases have both start and end dates
    for (let i = 0; i < phaseIndex; i++) {
      const prevPhase = phases[i];
      if (!prevPhase.start_date || !prevPhase.end_date) {
        return false;
      }
    }
    
    return true;
  };

  return (
    <div className="modal-overlay">
      <div className="edit-project-modal">
        <div className="modal-header">
          <h3><span style={{ fontWeight: 'normal' }}>Edit Project:</span> {project.title}</h3>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <div className="modal-body">
            {/* Left Sidebar */}
            <div className="modal-sidebar">
              <div className="sidebar-section">
                <button 
                  className={`sidebar-item ${activeSection === 'project' ? 'active' : ''}`}
                  onClick={() => setActiveSection('project')}
                >
                  <div className="sidebar-item-icon">
                    <Settings size={20} />
                  </div>
                  <div className="sidebar-item-content">
                    <div className="sidebar-item-title">Project Configuration</div>
                    <div className="sidebar-item-description">Basic settings and details</div>
                  </div>
                </button>
              </div>
              
              <div className="sidebar-section">
                <button 
                  className={`sidebar-item ${activeSection === 'phases' ? 'active' : ''}`}
                  onClick={() => setActiveSection('phases')}
                >
                  <div className="sidebar-item-icon">
                    <Layers size={20} />
                  </div>
                  <div className="sidebar-item-content">
                    <div className="sidebar-item-title">Phase Configuration</div>
                    <div className="sidebar-item-description">Project phases and timelines</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Right Content Area */}
            <div className="modal-main-content">
              {activeSection === 'project' && (
                <div className="content-section">
                  <div className="content-header">
                    <h3>Project Configuration</h3>
                    <p>Configure project settings, rubric, and evaluation forms</p>
                  </div>
                  
                  <div className="content-body">
                    {/* Project Group */}
                    <div className="project-group" style={{ padding: '24px' }}>
            
            {/* Project Basic Info Section */}
            <div className="section">
            <div className="form-group">
              <label>Project Title</label>
              <input
                type="text"
                value={projectData.title}
                onChange={(e) => handleProjectChange('title', e.target.value)}
                placeholder="Enter project title"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={projectData.description}
                onChange={(e) => handleProjectChange('description', e.target.value)}
                placeholder="Enter project description"
                rows={4}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="datetime-local"
                  value={projectData.start_date}
                  onChange={(e) => handleProjectChange('start_date', e.target.value)}
                  className={errors.start_date ? 'error' : ''}
                />
                {errors.start_date && (
                  <div className="error-message">
                    <AlertTriangle size={14} />
                    {errors.start_date}
                  </div>
                )}
              </div>
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="datetime-local"
                  value={projectData.due_date}
                  onChange={(e) => handleProjectChange('due_date', e.target.value)}
                  className={errors.due_date ? 'error' : ''}
                />
                {errors.due_date && (
                  <div className="error-message">
                    <AlertTriangle size={14} />
                    {errors.due_date}
                  </div>
                )}
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Breathe Phase Days</label>
                <input
                  type="number"
                  value={projectData.breathe_phase_days}
                  onChange={(e) => handleProjectChange('breathe_phase_days', parseInt(e.target.value) || 0)}
                  min="0"
                  max="30"
                />
              </div>
              <div className="form-group">
                <label>Project Rubric Type</label>
                <select
                  value={projectData.project_rubric_type}
                  onChange={(e) => handleProjectChange('project_rubric_type', e.target.value)}
                >
                  <option value="builtin">Built-in Rubric</option>
                  <option value="upload">Upload Rubric</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Project Evaluation Type</label>
                <select
                  value={projectData.project_evaluation_type}
                  onChange={(e) => handleProjectChange('project_evaluation_type', e.target.value)}
                >
                  <option value="builtin">Built-in Form</option>
                  <option value="custom">Custom Form</option>
                </select>
              </div>
              <div className="form-group">
                <label>Evaluation Deadline</label>
                <input
                  type="datetime-local"
                  value={projectData.project_evaluation_deadline}
                  onChange={(e) => handleProjectChange('project_evaluation_deadline', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Project Settings Section */}
          <div className={`section project-settings-section ${expandedProjectSettings ? 'expanded' : ''}`}>
            <div className="section-header" onClick={toggleProjectSettingsExpansion} style={{ cursor: 'pointer' }}>
              <h4>Project Settings</h4>
            </div>
            
            <div style={{ display: expandedProjectSettings ? 'block' : 'none' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Max File Size (MB)</label>
                <input
                  type="number"
                  value={projectData.max_file_size_mb}
                  onChange={(e) => handleProjectChange('max_file_size_mb', parseInt(e.target.value))}
                  min="1"
                  max="100"
                />
              </div>
              <div className="form-group">
                <label>Min Tasks per Member</label>
                <input
                  type="number"
                  value={projectData.min_tasks_per_member}
                  onChange={(e) => handleProjectChange('min_tasks_per_member', parseInt(e.target.value))}
                  min="1"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Max Tasks per Member</label>
                <input
                  type="number"
                  value={projectData.max_tasks_per_member}
                  onChange={(e) => handleProjectChange('max_tasks_per_member', parseInt(e.target.value))}
                  min="1"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Allowed File Types</label>
              <div className="file-types-container">
                <div className="file-types-layout">
                  <div className="categories-panel">
                    <div className="categories-list">
                      {Object.entries(fileTypeCategories).map(([category, types]) => {
                        const selectedCount = Array.isArray(projectData.file_types_allowed) ? 
                          types.filter(type => projectData.file_types_allowed.includes(type)).length : 0;
                        return (
                          <div 
                            key={category} 
                            className={`category-item ${selectedCount > 0 ? 'has-selection' : ''}`}
                            onClick={() => setSelectedCategory(category)}
                          >
                            <span className="category-name">{category}</span>
                            {selectedCount > 0 && (
                              <span className="category-count">{selectedCount}</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="file-types-panel">
                    {selectedCategory && fileTypeCategories[selectedCategory] && (
                      <div>
                        <div className="panel-header">
                          <h5>{selectedCategory} File Types</h5>
                        </div>
                        <div className="file-types-list">
                          {fileTypeCategories[selectedCategory].map(type => {
                            const isSelected = Array.isArray(projectData.file_types_allowed) && 
                                             projectData.file_types_allowed.includes(type);
                            return (
                              <label key={type} className={`file-type-option ${isSelected ? 'selected' : ''}`}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const currentTypes = Array.isArray(projectData.file_types_allowed) ? 
                                                      projectData.file_types_allowed : [];
                                    if (e.target.checked) {
                                      handleFileTypesChange([...currentTypes, type]);
                                    } else {
                                      handleFileTypesChange(currentTypes.filter(t => t !== type));
                                    }
                                  }}
                                />
                                <span className="file-type-label">{type.toUpperCase()}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!selectedCategory && (
                      <div className="no-category-selected">
                        <p>Select a category to view file types</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="selected-summary">
                  <div className="summary-info">
                    <strong>Selected: </strong>
                    {Array.isArray(projectData.file_types_allowed) && projectData.file_types_allowed.length > 0 ? (
                      <span className="selected-count">{projectData.file_types_allowed.length} file types</span>
                    ) : (
                      <span className="no-selection">No file types selected</span>
                    )}
                  </div>
                  {Array.isArray(projectData.file_types_allowed) && projectData.file_types_allowed.length > 0 && (
                    <button 
                      type="button"
                      className="clear-all-btn"
                      onClick={() => handleFileTypesChange([])}
                      title="Clear all selected file types"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Project Rubric Section */}
          {projectData.project_rubric_type === 'builtin' && (
            <div className={`section project-rubric-section ${expandedProjectRubric ? 'expanded' : ''}`}>
              <div className="section-header" onClick={toggleProjectRubricExpansion} style={{ cursor: 'pointer' }}>
                <h4>Project Rubric</h4>
              </div>
              
              <div style={{ display: expandedProjectRubric ? 'block' : 'none' }}>
              <div className="form-group">
                <label>Rubric Instructions</label>
                <textarea
                  value={projectRubric.instructions}
                  onChange={(e) => setProjectRubric(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Enter rubric instructions"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Total Points</label>
                <input
                  type="number"
                  value={projectRubric.totalPoints}
                  onChange={(e) => setProjectRubric(prev => ({ ...prev, totalPoints: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Rubric Criteria</label>
                <div className="criteria-container">
                  {projectRubric.criteria.map((criterion, index) => (
                    <div key={index} className="criterion-item">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Criterion Name</label>
                          <input
                            type="text"
                            value={criterion.name}
                            onChange={(e) => updateProjectRubricCriterion(index, 'name', e.target.value)}
                            placeholder="Enter criterion name"
                          />
                        </div>
                        <div className="form-group">
                          <label>Max Points</label>
                          <input
                            type="number"
                            value={criterion.maxPoints}
                            onChange={(e) => updateProjectRubricCriterion(index, 'maxPoints', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="form-group">
                          <button
                            type="button"
                            className="remove-criterion-btn"
                            onClick={() => removeProjectRubricCriterion(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          value={criterion.description}
                          onChange={(e) => updateProjectRubricCriterion(index, 'description', e.target.value)}
                          placeholder="Enter criterion description"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-criterion-btn"
                    onClick={addProjectRubricCriterion}
                  >
                    <Plus size={16} />
                    Add Criterion
                  </button>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Project Evaluation Section */}
          {projectData.project_evaluation_type === 'builtin' && (
            <div className={`section project-evaluation-section ${expandedProjectEvaluation ? 'expanded' : ''}`}>
              <div className="section-header" onClick={toggleProjectEvaluationExpansion} style={{ cursor: 'pointer' }}>
                <h4>Project Evaluation Form</h4>
              </div>
              
              <div style={{ display: expandedProjectEvaluation ? 'block' : 'none' }}>
              <div className="form-group">
                <label>Evaluation Instructions</label>
                <textarea
                  value={builtInEvaluation.instructions}
                  onChange={(e) => setBuiltInEvaluation(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Enter evaluation instructions"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Total Points</label>
                <input
                  type="number"
                  value={builtInEvaluation.totalPoints}
                  onChange={(e) => setBuiltInEvaluation(prev => ({ ...prev, totalPoints: parseInt(e.target.value) || 0 }))}
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Evaluation Criteria</label>
                <div className="criteria-container">
                  {builtInEvaluation.criteria.map((criterion, index) => (
                    <div key={index} className="criterion-item">
                      <div className="form-row">
                        <div className="form-group">
                          <label>Criterion Name</label>
                          <input
                            type="text"
                            value={criterion.name}
                            onChange={(e) => updateProjectEvaluationCriterion(index, 'name', e.target.value)}
                            placeholder="Enter criterion name"
                          />
                        </div>
                        <div className="form-group">
                          <label>Max Points</label>
                          <input
                            type="number"
                            value={criterion.maxPoints}
                            onChange={(e) => updateProjectEvaluationCriterion(index, 'maxPoints', parseInt(e.target.value) || 0)}
                            min="0"
                          />
                        </div>
                        <div className="form-group">
                          <button
                            type="button"
                            className="remove-criterion-btn"
                            onClick={() => removeProjectEvaluationCriterion(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          value={criterion.description}
                          onChange={(e) => updateProjectEvaluationCriterion(index, 'description', e.target.value)}
                          placeholder="Enter criterion description"
                          rows={2}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="add-criterion-btn"
                    onClick={addProjectEvaluationCriterion}
                  >
                    <Plus size={16} />
                    Add Criterion
                  </button>
                </div>
              </div>
              </div>
            </div>
          )}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'phases' && (
                <div className="content-section">
                  <div className="content-header">
                    <h3>Phase Configuration</h3>
                    <p>Configure project phases, timelines, and phase-specific settings</p>
                  </div>
                  
                  <div className="content-body" style={{ minHeight: '600px' }}>
                    {/* Phases Container */}
                    <div className="phases-container" style={{ padding: '24px', minHeight: '500px' }}>
              {phases && phases.length > 0 ? (
                phases.map((phase, index) => {
                const editable = canEditPhase(index);
                const phaseKey = `phase_${index}`;
                
                const isExpanded = expandedPhases[index] !== false; // Default to expanded
                
                return (
                  <div key={phase.id || `phase-${index}`} className={`phase-item ${!editable ? 'disabled' : ''}`}>
                    <div className="phase-header" onClick={() => togglePhaseExpansion(index)} style={{ cursor: 'pointer' }}>
                      <h5><span style={{ fontWeight: 'normal' }}>Phase {phase.phase_number}:</span> {phase.title}</h5>
                      {!editable && (
                        <div className="phase-warning">
                          <AlertTriangle size={14} />
                          Complete previous phases first
                        </div>
                      )}
                    </div>
                    
                    <div className="phase-content" style={{ display: isExpanded ? 'block' : 'none' }}>
                      <div className="form-group">
                        <label>Phase Title</label>
                        <input
                          type="text"
                          value={phase.title || ''}
                          onChange={(e) => handlePhaseChange(index, 'title', e.target.value)}
                          disabled={!editable}
                          placeholder="Enter phase title"
                        />
                      </div>
                      
                      <div className="form-group">
                        <label>Description</label>
                        <textarea
                          value={phase.description || ''}
                          onChange={(e) => handlePhaseChange(index, 'description', e.target.value)}
                          disabled={!editable}
                          placeholder="Enter phase description"
                          rows={3}
                        />
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Start Date</label>
                          <input
                            type="datetime-local"
                            value={phase.start_date || ''}
                            onChange={(e) => handlePhaseChange(index, 'start_date', e.target.value)}
                            disabled={!editable}
                            className={errors[`${phaseKey}_start_date`] ? 'error' : ''}
                          />
                          {errors[`${phaseKey}_start_date`] && (
                            <div className="error-message">
                              <AlertTriangle size={14} />
                              {errors[`${phaseKey}_start_date`]}
                            </div>
                          )}
                        </div>
                        
                        <div className="form-group">
                          <label>End Date</label>
                          <input
                            type="datetime-local"
                            value={phase.end_date || ''}
                            onChange={(e) => handlePhaseChange(index, 'end_date', e.target.value)}
                            disabled={!editable}
                            className={errors[`${phaseKey}_end_date`] ? 'error' : ''}
                          />
                          {errors[`${phaseKey}_end_date`] && (
                            <div className="error-message">
                              <AlertTriangle size={14} />
                              {errors[`${phaseKey}_end_date`]}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Max Attempts</label>
                          <input
                            type="number"
                            value={phase.max_attempts || 1}
                            onChange={(e) => handlePhaseChange(index, 'max_attempts', parseInt(e.target.value))}
                            disabled={!editable}
                            min="1"
                            max="10"
                          />
                        </div>
                        
                        <div className="form-group">
                          <label>Rubric Type</label>
                          <select
                            value={phase.rubricType || 'builtin'}
                            onChange={(e) => handlePhaseChange(index, 'rubricType', e.target.value)}
                            disabled={!editable}
                          >
                            <option value="builtin">Built-in Rubric</option>
                            <option value="upload">Upload Rubric</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="form-row">
                        <div className="form-group">
                          <label>Evaluation Form Type</label>
                          <select
                            value={phase.evaluation_form_type || 'builtin'}
                            onChange={(e) => handlePhaseChange(index, 'evaluation_form_type', e.target.value)}
                            disabled={!editable}
                          >
                            <option value="builtin">Built-in Form</option>
                            <option value="custom">Custom Form</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="form-group">
                        <label>Allowed File Types</label>
                        <div className="file-types-container">
                          <div className="file-types-layout">
                            <div className="categories-panel">
                              <div className="categories-list">
                                {Object.entries(fileTypeCategories).map(([category, types]) => {
                                  const selectedCount = Array.isArray(phase.file_types_allowed) ? 
                                    types.filter(type => phase.file_types_allowed.includes(type)).length : 0;
                                  return (
                                    <div 
                                      key={category} 
                                      className={`category-item ${selectedCount > 0 ? 'has-selection' : ''}`}
                                      onClick={() => handleSetSelectedPhaseCategory(index, category)}
                                    >
                                      <span className="category-name">{category}</span>
                                      {selectedCount > 0 && (
                                        <span className="category-count">{selectedCount}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="file-types-panel">
                              {selectedPhaseCategory[index] && fileTypeCategories[selectedPhaseCategory[index]] && (
                                <div>
                                  <div className="panel-header">
                                    <h5>{selectedPhaseCategory[index]} File Types</h5>
                                  </div>
                                  <div className="file-types-list">
                                    {fileTypeCategories[selectedPhaseCategory[index]].map(type => {
                                      const isSelected = Array.isArray(phase.file_types_allowed) && 
                                                       phase.file_types_allowed.includes(type);
                                      return (
                                        <label key={type} className={`file-type-option ${isSelected ? 'selected' : ''} ${!editable ? 'disabled' : ''}`}>
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            disabled={!editable}
                                            onChange={(e) => {
                                              const currentTypes = Array.isArray(phase.file_types_allowed) ? 
                                                                phase.file_types_allowed : [];
                                              if (e.target.checked) {
                                                handlePhaseFileTypesChange(index, [...currentTypes, type]);
                                              } else {
                                                handlePhaseFileTypesChange(index, currentTypes.filter(t => t !== type));
                                              }
                                            }}
                                          />
                                          <span className="file-type-label">{type.toUpperCase()}</span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                              {!selectedPhaseCategory[index] && (
                                <div className="no-category-selected">
                                  <p>Select a category to view file types</p>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="selected-summary">
                            <div className="summary-info">
                              <strong>Selected: </strong>
                              {Array.isArray(phase.file_types_allowed) && phase.file_types_allowed.length > 0 ? (
                                <span className="selected-count">{phase.file_types_allowed.length} file types</span>
                              ) : (
                                <span className="no-selection">No file types selected</span>
                              )}
                            </div>
                            {Array.isArray(phase.file_types_allowed) && phase.file_types_allowed.length > 0 && (
                              <button 
                                type="button"
                                className="clear-all-btn"
                                onClick={() => handlePhaseFileTypesChange(index, [])}
                                title="Clear all selected file types"
                                disabled={!editable}
                              >
                                Clear All
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Phase Rubric Section */}
                      {phase.rubricType === 'builtin' && (
                        <div className={`phase-rubric-section ${expandedRubrics[index] !== false ? 'expanded' : ''}`}>
                          <div className="section-header" onClick={() => toggleRubricExpansion(index)} style={{ cursor: 'pointer' }}>
                            <h5>Phase Rubric</h5>
                          </div>
                          
                          <div style={{ display: expandedRubrics[index] !== false ? 'block' : 'none' }}>
                          <div className="form-group">
                            <label>Rubric Instructions</label>
                            <textarea
                              value={phase.rubric.instructions}
                              onChange={(e) => handlePhaseChange(index, 'rubric', { ...phase.rubric, instructions: e.target.value })}
                              disabled={!editable}
                              placeholder="Enter rubric instructions"
                              rows={2}
                            />
                          </div>
                          <div className="form-group">
                            <label>Total Points</label>
                            <input
                              type="number"
                              value={phase.rubric.totalPoints}
                              onChange={(e) => handlePhaseChange(index, 'rubric', { ...phase.rubric, totalPoints: parseInt(e.target.value) || 0 })}
                              disabled={!editable}
                              min="0"
                            />
                          </div>
                          <div className="form-group">
                            <label>Rubric Criteria</label>
                            <div className="criteria-container">
                              {phase.rubric.criteria.map((criterion, criterionIndex) => (
                                <div key={criterionIndex} className="criterion-item">
                                  <div className="form-row">
                                    <div className="form-group">
                                      <label>Criterion Name</label>
                                      <input
                                        type="text"
                                        value={criterion.name}
                                        onChange={(e) => updatePhaseRubricCriterion(index, criterionIndex, 'name', e.target.value)}
                                        disabled={!editable}
                                        placeholder="Enter criterion name"
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>Max Points</label>
                                      <input
                                        type="number"
                                        value={criterion.maxPoints}
                                        onChange={(e) => updatePhaseRubricCriterion(index, criterionIndex, 'maxPoints', parseInt(e.target.value) || 0)}
                                        disabled={!editable}
                                        min="0"
                                      />
                                    </div>
                                    <div className="form-group">
                                      <button
                                        type="button"
                                        className="remove-criterion-btn"
                                        onClick={() => removePhaseRubricCriterion(index, criterionIndex)}
                                        disabled={!editable}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                      value={criterion.description}
                                      onChange={(e) => updatePhaseRubricCriterion(index, criterionIndex, 'description', e.target.value)}
                                      disabled={!editable}
                                      placeholder="Enter criterion description"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="add-criterion-btn"
                                onClick={() => addPhaseRubricCriterion(index)}
                                disabled={!editable}
                              >
                                <Plus size={16} />
                                Add Criterion
                              </button>
                            </div>
                          </div>
                          </div>
                        </div>
                      )}

                      {/* Phase Evaluation Section */}
                      {phase.evaluation_form_type === 'builtin' && (
                        <div className={`phase-evaluation-section ${expandedEvaluations[index] !== false ? 'expanded' : ''}`}>
                          <div className="section-header" onClick={() => toggleEvaluationExpansion(index)} style={{ cursor: 'pointer' }}>
                            <h5>Phase Evaluation Form</h5>
                          </div>
                          
                          <div style={{ display: expandedEvaluations[index] !== false ? 'block' : 'none' }}>
                          <div className="form-group">
                            <label>Evaluation Instructions</label>
                            <textarea
                              value={phase.builtInEvaluation.instructions}
                              onChange={(e) => handlePhaseChange(index, 'builtInEvaluation', { ...phase.builtInEvaluation, instructions: e.target.value })}
                              disabled={!editable}
                              placeholder="Enter evaluation instructions"
                              rows={2}
                            />
                          </div>
                          <div className="form-group">
                            <label>Total Points</label>
                            <input
                              type="number"
                              value={phase.builtInEvaluation.totalPoints}
                              onChange={(e) => handlePhaseChange(index, 'builtInEvaluation', { ...phase.builtInEvaluation, totalPoints: parseInt(e.target.value) || 0 })}
                              disabled={!editable}
                              min="0"
                            />
                          </div>
                          <div className="form-group">
                            <label>Evaluation Criteria</label>
                            <div className="criteria-container">
                              {phase.builtInEvaluation.criteria.map((criterion, criterionIndex) => (
                                <div key={criterionIndex} className="criterion-item">
                                  <div className="form-row">
                                    <div className="form-group">
                                      <label>Criterion Name</label>
                                      <input
                                        type="text"
                                        value={criterion.name}
                                        onChange={(e) => updatePhaseEvaluationCriterion(index, criterionIndex, 'name', e.target.value)}
                                        disabled={!editable}
                                        placeholder="Enter criterion name"
                                      />
                                    </div>
                                    <div className="form-group">
                                      <label>Max Points</label>
                                      <input
                                        type="number"
                                        value={criterion.maxPoints}
                                        onChange={(e) => updatePhaseEvaluationCriterion(index, criterionIndex, 'maxPoints', parseInt(e.target.value) || 0)}
                                        disabled={!editable}
                                        min="0"
                                      />
                                    </div>
                                    <div className="form-group">
                                      <button
                                        type="button"
                                        className="remove-criterion-btn"
                                        onClick={() => removePhaseEvaluationCriterion(index, criterionIndex)}
                                        disabled={!editable}
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </div>
                                  </div>
                                  <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                      value={criterion.description}
                                      onChange={(e) => updatePhaseEvaluationCriterion(index, criterionIndex, 'description', e.target.value)}
                                      disabled={!editable}
                                      placeholder="Enter criterion description"
                                      rows={2}
                                    />
                                  </div>
                                </div>
                              ))}
                              <button
                                type="button"
                                className="add-criterion-btn"
                                onClick={() => addPhaseEvaluationCriterion(index)}
                                disabled={!editable}
                              >
                                <Plus size={16} />
                                Add Criterion
                              </button>
                            </div>
                          </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                <p>No phases found for this project.</p>
              </div>
            )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .edit-project-modal {
          width: 92%;
          max-width: 1400px;
          max-height: 90vh;
          background: rgba(9, 18, 44, 0.15);
          border: 0.1px solid rgb(95, 95, 95);
          borderRadius: 0px;
          boxShadow: rgba(0, 0, 0, 0.5) 0px 4px 12px;
          backdropFilter: blur(3.2px) saturate(120%);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          margin: 0 auto;
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
          font-size: 1.25rem;
          font-weight: 700;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 6px;
          color: rgb(135, 35, 65);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-button:hover {
          background: rgba(135, 35, 65, 0.1);
          transform: rotate(90deg);
        }

        .modal-content {
          flex: 1;
          padding: 0;
          overflow: hidden;
          width: 100%;
          max-width: none;
          display: flex;
          flex-direction: column;
          box-shadow: none !important;
        }

        .modal-body {
          display: flex;
          flex: 1;
          min-height: 0;
          box-shadow: none !important;
        }

        .modal-sidebar {
          width: 320px;
          background: rgb(9, 18, 44);
          border-right: 2px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          overflow-y: auto;
        }

        .sidebar-section {
          margin-bottom: 8px;
          background: transparent !important;
        }

        .sidebar-item {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 12px 16px;
          border: 2px solid transparent;
          border-radius: 8px;
          background: transparent !important;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }

        .sidebar-item:hover {
          background: rgba(135, 35, 65, 0.2) !important;
          border-color: transparent;
        }

        .sidebar-item.active {
          background: rgba(135, 35, 65, 0.3) !important;
          border-color: rgb(135, 35, 65);
          box-shadow: none;
        }

        .sidebar-item * {
          background: transparent !important;
        }

        .sidebar-item-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          flex-shrink: 0;
          color: rgba(255, 255, 255, 0.7);
        }

        .sidebar-item.active .sidebar-item-icon {
          background: rgb(135, 35, 65);
          color: white;
        }

        .sidebar-item-content {
          flex: 1;
          background: transparent !important;
        }

        .sidebar-item-title {
          font-weight: 600;
          color: white;
          font-size: 14px;
          margin-bottom: 2px;
          background: transparent !important;
        }

        .sidebar-item-description {
          color: rgba(255, 255, 255, 0.7);
          font-size: 12px;
          line-height: 1.4;
          background: transparent !important;
        }

        .modal-main-content {
          flex: 1;
          padding: 0;
          overflow: hidden;
          background: rgb(9, 18, 44);
          display: flex;
          flex-direction: column;
          min-width: 0;
          box-shadow: none !important;
        }

        .content-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          min-height: 0;
        }

        .content-header {
          padding: 20px 24px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
          background: rgb(9, 18, 44);
          flex-shrink: 0;
          margin-bottom: 0;
        }

        .content-body {
          flex: 1;
          padding: 0;
          overflow-y: auto;
          background: rgb(9, 18, 44);
          min-height: 0;
        }

        .content-header h3 {
          margin: 0 0 8px 0;
          color: white;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .content-header p {
          margin: 0;
          color: rgba(255, 255, 255, 0.7);
          font-size: 14px;
        }

        .project-group, .phases-group {
          margin-bottom: 0;
          border: none;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .group-header {
          display: none;
        }

        .group-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .project-group .section, .phases-group .section {
          margin-bottom: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 20px;
          box-shadow: none;
        }

        .project-group .section:last-child, .phases-group .section:last-child {
          margin-bottom: 0;
        }

        .section {
          margin-bottom: 20px;
        }

        .section h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 0 16px 0;
          color: white;
          font-size: 16px;
          font-weight: 600;
          padding: 0;
          background: transparent;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 500;
          font-size: 14px;
        }

        .form-group input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }

        .form-group input:focus {
          outline: none;
          border-color: rgb(135, 35, 65);
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.2);
          background: rgba(255, 255, 255, 0.08);
        }

        .form-group input.error {
          border-color: #ef4444;
        }

        .form-group input:disabled,
        .form-group textarea:disabled,
        .form-group select:disabled {
          background: rgba(255, 255, 255, 0.02);
          color: rgba(255, 255, 255, 0.4);
          cursor: not-allowed;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 80px;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          transition: all 0.2s ease;
        }

        .form-group textarea:focus {
          outline: none;
          border-color: rgb(135, 35, 65);
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.2);
          background: rgba(255, 255, 255, 0.08);
        }

        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.05);
          color: white;
          transition: all 0.2s ease;
        }

        .form-group select:focus {
          outline: none;
          border-color: rgb(135, 35, 65);
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.2);
          background: rgba(255, 255, 255, 0.08);
        }

        .form-group select option {
          background: rgb(9, 18, 44);
          color: white;
        }

        .file-types-container {
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.03);
        }

        .file-types-layout {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
          min-height: 200px;
        }

        .categories-panel {
          width: 40%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
        }

        .categories-list {
          display: flex;
          flex-direction: column;
        }

        .category-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          cursor: pointer;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s ease;
          font-size: 13px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
        }

        .category-item:hover {
          background: rgba(135, 35, 65, 0.2);
        }

        .category-item.has-selection {
          background: rgba(135, 35, 65, 0.3);
          color: white;
        }

        .category-item.has-selection:hover {
          background: rgba(135, 35, 65, 0.4);
        }

        .category-name {
          font-size: 13px;
        }

        .category-count {
          background: rgb(135, 35, 65);
          color: white;
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 600;
          min-width: 20px;
          text-align: center;
        }

        .file-types-panel {
          width: 60%;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          overflow-y: auto;
        }

        .panel-header {
          position: sticky;
          top: 0;
          z-index: 5;
          padding: 10px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(9, 18, 44, 0.95);
          border-radius: 6px 6px 0 0;
          box-shadow: none;
          margin: -1px -1px 0 -1px;
        }

        .panel-header h5 {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: white;
        }

        .no-category-selected {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 20px;
          color: rgba(255, 255, 255, 0.5);
          font-size: 14px;
        }

        .file-types-list {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 12px;
        }

        .file-type-option {
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.05);
          color: rgba(255, 255, 255, 0.9);
        }

        .file-type-option:hover:not(.disabled) {
          background: rgba(135, 35, 65, 0.2);
          border-color: rgb(135, 35, 65);
        }

        .file-type-option.selected {
          background: rgba(135, 35, 65, 0.3);
          color: white;
          border-color: rgb(135, 35, 65);
        }

        .file-type-option.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .file-type-option input[type="checkbox"] {
          margin: 0;
          cursor: pointer;
          accent-color: rgb(135, 35, 65);
        }

        .file-type-option.disabled input[type="checkbox"] {
          cursor: not-allowed;
        }

        .file-type-label {
          font-size: 11px;
          font-weight: 500;
        }

        .selected-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9);
        }

        .summary-info {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .clear-all-btn {
          padding: 6px 12px;
          background: rgb(135, 35, 65);
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clear-all-btn:hover:not(:disabled) {
          background: rgb(110, 25, 50);
        }

        .clear-all-btn:disabled {
          background: rgba(255, 255, 255, 0.2);
          cursor: not-allowed;
        }

        .selected-count {
          color: rgb(135, 35, 65);
          font-weight: 600;
        }

        .no-selection {
          color: rgba(255, 255, 255, 0.5);
          font-style: italic;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 6px;
          color: #ef4444;
          font-size: 12px;
        }

        .phases-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .phase-item {
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 20px;
          background: rgba(255, 255, 255, 0.05);
          width: 100%;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
        }

        .phase-item:hover {
          box-shadow: 0 4px 16px rgba(135, 35, 65, 0.3);
          border-color: rgba(135, 35, 65, 0.5);
        }

        .phase-item.disabled {
          opacity: 0.5;
          background: rgba(255, 255, 255, 0.02);
        }

        .phase-header {
          width: 100%;
          padding: 0 0 12px 0;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 20px;
          cursor: pointer;
          display: block;
        }

        .phase-header h5 {
          margin: 0;
          color: white;
          font-size: 18px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .phase-header h5 span {
          color: rgba(255, 255, 255, 0.7);
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-radius: 6px;
          margin-bottom: 16px;
          cursor: pointer;
        }

        .section-header h4,
        .section-header h5 {
          margin: 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: 15px;
          font-weight: 600;
        }

        .phase-warning {
          display: flex;
          align-items: center;
          gap: 4px;
          color: #f59e0b;
          font-size: 12px;
          font-weight: 500;
        }

        .phase-content {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
        }

        .modal-footer {
          padding: 16px 20px;
          border-top: 2px solid rgb(135, 35, 65);
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          background: rgb(9, 18, 44);
        }

        .btn {
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: transparent;
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.1);
        }

        .btn-primary {
          background: rgb(135, 35, 65) !important;
          color: white !important;
          border: none !important;
        }

        .btn-primary:hover:not(:disabled) {
          background: rgb(110, 25, 50) !important;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .criteria-container {
          /* Removed background card styling */
        }

        .criterion-item {
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          background: rgba(255, 255, 255, 0.05);
          transition: all 0.2s ease;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .criterion-item:hover {
          border-color: rgb(135, 35, 65);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.3);
          transform: translateY(-2px);
        }

        .criterion-item:last-child {
          margin-bottom: 0;
        }

        .add-criterion-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgb(135, 35, 65);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 8px;
        }

        .add-criterion-btn:hover:not(:disabled) {
          background: rgb(110, 25, 50);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.4);
        }

        .add-criterion-btn:disabled {
          background: rgba(255, 255, 255, 0.2);
          cursor: not-allowed;
        }

        .remove-criterion-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          background: rgb(135, 35, 65);
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
          width: 36px;
          height: 36px;
        }

        .remove-criterion-btn:hover:not(:disabled) {
          background: rgb(110, 25, 50);
          transform: scale(1.1);
        }

        .remove-criterion-btn:disabled {
          background: rgba(255, 255, 255, 0.2);
          cursor: not-allowed;
        }

        .phase-rubric-section,
        .phase-evaluation-section,
        .project-rubric-section,
        .project-evaluation-section,
        .project-settings-section {
          margin-top: 20px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: all 0.2s ease;
        }

        .phase-rubric-section.expanded:hover,
        .phase-evaluation-section.expanded:hover,
        .project-rubric-section.expanded:hover,
        .project-evaluation-section.expanded:hover,
        .project-settings-section.expanded:hover {
          box-shadow: 0 4px 16px rgba(135, 35, 65, 0.3);
        }

        .project-rubric-section:hover,
        .project-evaluation-section:hover,
        .project-settings-section:hover,
        .phase-rubric-section:hover,
        .phase-evaluation-section:hover {
          transform: translateY(-2px);
          border-color: rgba(135, 35, 65, 0.5);
        }

        .phase-rubric-section h5,
        .phase-evaluation-section h5 {
          margin: 0 0 12px 0;
          color: rgba(255, 255, 255, 0.9);
          font-size: 15px;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .edit-project-modal {
            width: 95%;
            max-height: 95vh;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .modal-footer {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};

export default EditProjectModal;
