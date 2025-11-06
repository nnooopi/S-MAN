import React, { useState } from 'react';
import { X, Plus, Trash2, Upload, FileText, ChevronDown, AlertCircle, CheckCircle, RotateCcw, Calendar, Clock, Info } from 'lucide-react';
import dayjs from 'dayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';

const SimplifiedProjectCreator = ({ onClose, onProjectCreated, courseId, course }) => {
  // Preset projects and phases mapped by course code
  const presetProjectsData = {
    'FOPR111': [
      {
        title: 'Basic Calculator App',
        description: 'Develop a functional calculator application using fundamental programming concepts',
        phases: ['Planning & Design', 'Implementation', 'Testing & Debugging']
      },
      {
        title: 'Grade Averaging System',
        description: 'Create a system to calculate and display student grade averages',
        phases: ['Logic Drafting', 'Code Development', 'Program Validation']
      },
      {
        title: 'Simple Payroll Program',
        description: 'Build a payroll calculation program with basic employee data management',
        phases: ['Requirement Analysis', 'Coding', 'Output Evaluation']
      }
    ],
    'OOPR211': [
      {
        title: 'Library Management System',
        description: 'Design a library management system using object-oriented principles',
        phases: ['Class Design', 'Function Implementation', 'System Testing']
      },
      {
        title: 'Student Record System',
        description: 'Create a student record management system with OOP concepts',
        phases: ['Object Modeling', 'Code Integration', 'Feature Validation']
      },
      {
        title: 'Inventory Tracker',
        description: 'Develop an inventory tracking system using classes and objects',
        phases: ['UML Creation', 'Class Construction', 'Program Demonstration']
      }
    ],
    'OOPR212': [
      {
        title: 'Point of Sale System',
        description: 'Build an advanced POS system with OOP design patterns',
        phases: ['Architecture Planning', 'Feature Development', 'Final Testing']
      },
      {
        title: 'Reservation System',
        description: 'Create a reservation management system with advanced OOP features',
        phases: ['Interface Setup', 'Module Linking', 'Quality Assurance']
      },
      {
        title: 'Employee Management System',
        description: 'Develop a comprehensive employee management system',
        phases: ['Data Handling', 'Function Expansion', 'Debug Phase']
      }
    ],
    'INPR111': [
      {
        title: 'Banking System',
        description: 'Create a banking system with intermediate programming concepts',
        phases: ['Structure Design', 'Coding', 'Data Validation']
      },
      {
        title: 'Scheduling App',
        description: 'Build a scheduling application with complex logic',
        phases: ['Workflow Planning', 'Development', 'System Review']
      },
      {
        title: 'File Management Utility',
        description: 'Develop a file management utility with advanced features',
        phases: ['Algorithm Setup', 'Logic Building', 'Performance Test']
      }
    ],
    'IPTC311': [
      {
        title: 'Portfolio Website',
        description: 'Build a dynamic portfolio website with full-stack integration',
        phases: ['Frontend Planning', 'Backend Integration', 'Deployment']
      },
      {
        title: 'Student Portal',
        description: 'Create a student portal with integrated programming technologies',
        phases: ['UI Mockup', 'Function Implementation', 'System Debugging']
      },
      {
        title: 'To-Do Web App',
        description: 'Develop a to-do web application with API integration',
        phases: ['API Setup', 'Feature Enhancement', 'Optimization']
      }
    ],
    'IPTC312': [
      {
        title: 'E-Commerce Website',
        description: 'Build a full-featured e-commerce website',
        phases: ['System Planning', 'Module Integration', 'Live Testing']
      },
      {
        title: 'Online Forum',
        description: 'Create an online forum with security features',
        phases: ['Feature Setup', 'Security Implementation', 'Maintenance Testing']
      },
      {
        title: 'Job Finder Platform',
        description: 'Develop a job finder platform with matching algorithms',
        phases: ['Design Stage', 'Integration Stage', 'Evaluation Stage']
      }
    ],
    'ITCP311': [
      {
        title: 'Proposal Development',
        description: 'Develop a comprehensive IT project proposal',
        phases: ['Problem Identification', 'Requirement Gathering', 'System Design']
      },
      {
        title: 'Documentation Setup',
        description: 'Create detailed project documentation and prototypes',
        phases: ['Research Compilation', 'Prototype Creation', 'Approval Preparation']
      },
      {
        title: 'Initial Implementation',
        description: 'Begin implementation of capstone project',
        phases: ['Development Start', 'Testing', 'Revision']
      }
    ],
    'ITCP312': [
      {
        title: 'Full System Development',
        description: 'Complete development of capstone project',
        phases: ['Build', 'Test', 'Deploy']
      },
      {
        title: 'System Evaluation',
        description: 'Comprehensive system evaluation and refinement',
        phases: ['User Testing', 'Bug Fixing', 'Enhancement']
      },
      {
        title: 'Final Defense Prep',
        description: 'Prepare for final project defense and submission',
        phases: ['Documentation Finalization', 'Presentation', 'Submission']
      }
    ],
    'WBDV111': [
      {
        title: 'Personal Website',
        description: 'Create a personal website using web development fundamentals',
        phases: ['Design Phase', 'Coding Phase', 'Debugging Phase']
      },
      {
        title: 'Blog Platform',
        description: 'Build a blog platform with content management',
        phases: ['Planning', 'Development', 'Optimization']
      },
      {
        title: 'Restaurant Web App',
        description: 'Develop a restaurant website with menu and ordering features',
        phases: ['UI Drafting', 'Integration', 'Testing']
      }
    ],
    'WBDV112': [
      {
        title: 'Dynamic Portfolio',
        description: 'Create an advanced dynamic portfolio with API integration',
        phases: ['Design Revamp', 'API Connection', 'Optimization']
      },
      {
        title: 'School Portal',
        description: 'Build a school portal with authentication and dashboards',
        phases: ['Authentication Setup', 'Dashboard Development', 'Error Handling']
      },
      {
        title: 'Event Management App',
        description: 'Develop an event management application',
        phases: ['Planning', 'Implementation', 'Deployment']
      }
    ],
    'ADET211': [
      {
        title: 'Mobile App Prototype',
        description: 'Create a mobile application prototype using emerging technologies',
        phases: ['Wireframing', 'Development', 'Testing']
      },
      {
        title: 'IoT-Based System',
        description: 'Develop an IoT-based system with hardware integration',
        phases: ['Hardware Setup', 'Integration', 'Evaluation']
      },
      {
        title: 'AR/VR Demo',
        description: 'Build an AR/VR demonstration project',
        phases: ['Concept Design', 'Coding', 'Simulation']
      }
    ],
    'MADS211': [
      {
        title: 'Interactive Ad',
        description: 'Create an interactive advertisement with multimedia elements',
        phases: ['Storyboard Creation', 'Asset Production', 'Final Rendering']
      },
      {
        title: 'Animation Project',
        description: 'Develop an animation project with professional design',
        phases: ['Concept Art', 'Animation Development', 'Post-Editing']
      },
      {
        title: 'Promotional Website',
        description: 'Build a promotional website with multimedia integration',
        phases: ['Design', 'Multimedia Integration', 'Testing']
      }
    ],
    'NETW311': [
      {
        title: 'LAN Setup',
        description: 'Design and implement a Local Area Network',
        phases: ['Network Planning', 'Cabling & Configuration', 'Connectivity Test']
      },
      {
        title: 'Router Configuration',
        description: 'Configure routers with proper routing protocols',
        phases: ['Setup', 'Routing Rules', 'Verification']
      },
      {
        title: 'IP Subnetting Project',
        description: 'Implement IP subnetting for network optimization',
        phases: ['Design', 'Implementation', 'Validation']
      }
    ],
    'NETW312': [
      {
        title: 'Wireless Network',
        description: 'Design and deploy a wireless network infrastructure',
        phases: ['Network Design', 'Device Configuration', 'Testing']
      },
      {
        title: 'Server Setup',
        description: 'Set up and configure network servers',
        phases: ['Installation', 'Service Management', 'Monitoring']
      },
      {
        title: 'Network Security Demo',
        description: 'Demonstrate network security concepts and implementations',
        phases: ['Threat Simulation', 'Protection Setup', 'Evaluation']
      }
    ],
    'SIAA311': [
      {
        title: 'System Blueprint',
        description: 'Create a comprehensive system integration blueprint',
        phases: ['Requirement Analysis', 'Module Mapping', 'Initial Integration']
      },
      {
        title: 'Prototype Build',
        description: 'Build an integrated system prototype',
        phases: ['Module Development', 'Interconnection', 'Testing']
      },
      {
        title: 'Integration Report',
        description: 'Prepare a detailed system integration report',
        phases: ['Evaluation', 'Documentation', 'Presentation']
      }
    ],
    'SIAA312': [
      {
        title: 'Final System Enhancement',
        description: 'Enhance and optimize integrated system',
        phases: ['Review', 'Upgrade', 'Optimization']
      },
      {
        title: 'System Stress Test',
        description: 'Perform comprehensive system stress testing',
        phases: ['Load Testing', 'Error Fixing', 'Stabilization']
      },
      {
        title: 'Deployment Phase',
        description: 'Deploy the integrated system to production',
        phases: ['Installation', 'Maintenance Setup', 'Final Evaluation']
      }
    ],
    'SADM411': [
      {
        title: 'Server Deployment',
        description: 'Deploy and configure enterprise servers',
        phases: ['Installation', 'Configuration', 'Access Control']
      },
      {
        title: 'System Monitoring',
        description: 'Implement system monitoring and maintenance procedures',
        phases: ['Log Analysis', 'Issue Resolution', 'Reporting']
      },
      {
        title: 'Backup & Recovery',
        description: 'Establish backup and disaster recovery systems',
        phases: ['Backup Strategy', 'Simulation', 'Verification']
      }
    ],
    'ITPM311': [
      {
        title: 'Project Proposal',
        description: 'Create a comprehensive IT project proposal',
        phases: ['Scope Definition', 'Task Planning', 'Approval']
      },
      {
        title: 'Execution Phase',
        description: 'Execute IT project with proper management',
        phases: ['Team Coordination', 'Progress Tracking', 'Issue Resolution']
      },
      {
        title: 'Closing Phase',
        description: 'Close project with proper documentation',
        phases: ['Evaluation', 'Documentation', 'Final Presentation']
      }
    ],
    'BUSM311': [
      {
        title: 'Business Process Analysis',
        description: 'Analyze and optimize business processes',
        phases: ['Workflow Mapping', 'Tool Selection', 'Design']
      },
      {
        title: 'Application Deployment',
        description: 'Deploy business applications for enterprise use',
        phases: ['Setup', 'Customization', 'Integration']
      },
      {
        title: 'Performance Review',
        description: 'Review and optimize application performance',
        phases: ['Monitoring', 'Feedback', 'Optimization']
      }
    ],
    'IAAS311': [
      {
        title: 'Risk Assessment',
        description: 'Conduct comprehensive information security risk assessment',
        phases: ['Asset Identification', 'Threat Evaluation', 'Report']
      },
      {
        title: 'Security Policy Project',
        description: 'Develop organizational security policies',
        phases: ['Drafting', 'Review', 'Implementation']
      },
      {
        title: 'Network Defense Simulation',
        description: 'Simulate network defense scenarios',
        phases: ['Setup', 'Testing', 'Analysis']
      }
    ],
    'IAAS312': [
      {
        title: 'Penetration Testing',
        description: 'Conduct penetration testing on systems',
        phases: ['Planning', 'Execution', 'Report Generation']
      },
      {
        title: 'Data Encryption Project',
        description: 'Implement data encryption solutions',
        phases: ['Implementation', 'Testing', 'Evaluation']
      },
      {
        title: 'Security Audit',
        description: 'Perform comprehensive security audit',
        phases: ['System Review', 'Findings', 'Presentation']
      }
    ]
  };

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

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startDate: '',
    dueDate: '',
    fileTypesAllowed: [],
    maxFileSizeMb: 10,
    minTasksPerMember: 1,
    maxTasksPerMember: 5,
    breathePhaseDays: 0, // Days between phases
    evaluationPhaseDays: 0, // Days for evaluation phase after each phase ends
    projectRubricType: '',
    projectRubricFile: null,
    projectEvaluationType: '',
    projectEvaluationForm: null
  });

  const [builtInEvaluation, setBuiltInEvaluation] = useState({
    criteria: [
      { name: 'Contribution', maxPoints: 20, description: 'Contributes meaningfully to group discussions and project development' },
      { name: 'Compliance', maxPoints: 15, description: 'Completes group assignments and tasks on time' },
      { name: 'Quality Work', maxPoints: 25, description: 'Prepares work in a quality manner with attention to detail' },
      { name: 'Cooperation', maxPoints: 15, description: 'Demonstrates a cooperative and supportive attitude' },
      { name: 'Overall Performance', maxPoints: 25, description: 'Overall performance and leadership in the project' }
    ],
    totalPoints: 100,
    instructions: 'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.'
  });

  const [phases, setPhases] = useState([]);
  const [projectRubric, setProjectRubric] = useState({
    instructions: 'Your project will be evaluated using the following criteria. Each criterion has a maximum score, and your total grade is the sum of all criteria scores.',
    criteria: [
      { name: 'Quality of Work', maxPoints: 25, description: 'Overall quality and completeness' },
      { name: 'Technical Implementation', maxPoints: 25, description: 'Technical skills and implementation' },
      { name: 'Documentation', maxPoints: 20, description: 'Documentation quality and completeness' },
      { name: 'Presentation', maxPoints: 15, description: 'Presentation and communication' },
      { name: 'Teamwork', maxPoints: 15, description: 'Collaboration and teamwork' }
    ],
    totalPoints: 100
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPhaseCategory, setSelectedPhaseCategory] = useState({});
  const [currentStep, setCurrentStep] = useState('project-setup');
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [showAutoSetModal, setShowAutoSetModal] = useState(false);
  const [autoSetConfig, setAutoSetConfig] = useState({
    phaseDurationDays: 7,
    numberOfPhases: 3,
    autoSpacePhases: true
  });
  
  // Preset mode state
  const [showPresetMode, setShowPresetMode] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [presetPhaseDuration, setPresetPhaseDuration] = useState(7); // Default 7 days per phase
  
  // Get available presets based on course code
  const availablePresets = course?.course_code ? presetProjectsData[course.course_code] || [] : [];
  const hasPresets = availablePresets.length > 0;
  
  // Check if all required project setup fields are complete
  const isProjectSetupComplete = () => {
    // Basic project info
    const hasBasicInfo = formData.startDate && formData.evaluationPhaseDays > 0;
    
    // Project rubric check
    const hasProjectRubric = formData.projectRubricType === 'upload' 
      ? formData.projectRubricFile !== null 
      : formData.projectRubricType === 'builtin' 
        ? projectRubric?.criteria?.length >= 2 
        : formData.projectRubricType === 'none';
    
    // Project evaluation check
    const hasProjectEvaluation = formData.projectEvaluationType === 'custom'
      ? formData.projectEvaluationForm !== null
      : formData.projectEvaluationType === 'builtin'
        ? builtInEvaluation?.criteria?.length >= 2
        : formData.projectEvaluationType === 'none';
    
    return hasBasicInfo && hasProjectRubric && hasProjectEvaluation;
  };
  
  // Get list of missing required fields
  const getMissingFields = () => {
    const missing = [];
    
    if (!formData.startDate) {
      missing.push('Project Start Date');
    }
    if (!formData.evaluationPhaseDays || formData.evaluationPhaseDays <= 0) {
      missing.push('Evaluation Phase Days');
    }
    if (!formData.projectRubricType) {
      missing.push('Project Rubric Type (Built-in, Upload, or None)');
    } else if (formData.projectRubricType === 'upload' && !formData.projectRubricFile) {
      missing.push('Project Rubric File Upload');
    } else if (formData.projectRubricType === 'builtin' && (!projectRubric?.criteria || projectRubric.criteria.length < 2)) {
      missing.push('Project Rubric Criteria (at least 2)');
    }
    
    if (!formData.projectEvaluationType) {
      missing.push('Project Evaluation Type (Built-in, Custom, or None)');
    } else if (formData.projectEvaluationType === 'custom' && !formData.projectEvaluationForm) {
      missing.push('Project Evaluation Form Upload');
    } else if (formData.projectEvaluationType === 'builtin' && (!builtInEvaluation?.criteria || builtInEvaluation.criteria.length < 2)) {
      missing.push('Project Evaluation Criteria (at least 2)');
    }
    
    return missing;
  };

  // Helper function to check if auto-set configuration is valid
  const isAutoSetConfigValid = () => {
    if (!formData.startDate || !formData.dueDate) return false;
    
    const startDate = dayjs(formData.startDate);
    const dueDate = dayjs(formData.dueDate);
    
    // If due date is at midnight (start of day), we effectively have less time
    // since buffers run until 11:59 PM, they need the previous day
    const isDueDateAtMidnight = dueDate.hour() === 0 && dueDate.minute() === 0 && dueDate.second() === 0;
    const effectiveDueDate = isDueDateAtMidnight ? dueDate.subtract(1, 'second') : dueDate;
    const totalDays = effectiveDueDate.diff(startDate, 'day', true); // true for decimal days
    
    const bufferDays = (formData.evaluationPhaseDays || 0) + (formData.breathePhaseDays || 0);
    const numPhases = autoSetConfig.numberOfPhases;
    
    if (autoSetConfig.autoSpacePhases) {
      // When auto-spacing: (phase days + buffer after each) × phases ≤ total
      // Buffer happens AFTER EVERY phase, including the last one
      const totalNeeded = (numPhases * 1) + (numPhases * bufferDays); // Minimum 1 day per phase + buffer after each
      return totalNeeded <= totalDays;
    } else {
      // When not auto-spacing: (phaseDuration + buffer after each) × phases ≤ total
      // Buffer happens AFTER EVERY phase, including the last one
      const totalNeeded = (autoSetConfig.phaseDurationDays * numPhases) + (numPhases * bufferDays);
      return totalNeeded <= totalDays;
    }
  };

  // Reset modal state
  const resetModal = () => {
    setFormData({
      title: '',
      description: '',
      startDate: '',
      dueDate: '',
      fileTypesAllowed: [],
      maxFileSizeMb: 10,
      minTasksPerMember: 1,
      maxTasksPerMember: 5,
      breathePhaseDays: 0,
      evaluationPhaseDays: 0,
      projectRubricType: '',
      projectRubricFile: null,
      projectEvaluationType: '',
      projectEvaluationForm: null
    });
    setBuiltInEvaluation({
      criteria: [
        { name: 'Contribution', maxPoints: 20, description: 'Contributes meaningfully to group discussions and project development' },
        { name: 'Compliance', maxPoints: 15, description: 'Completes group assignments and tasks on time' },
        { name: 'Quality Work', maxPoints: 25, description: 'Prepares work in a quality manner with attention to detail' },
        { name: 'Cooperation', maxPoints: 15, description: 'Demonstrates a cooperative and supportive attitude' },
        { name: 'Overall Performance', maxPoints: 25, description: 'Overall performance and leadership in the project' }
      ],
      totalPoints: 100,
      instructions: 'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.'
    });
    setProjectRubric({
      instructions: 'Your project will be evaluated using the following criteria. Each criterion has a maximum score, and your total grade is the sum of all criteria scores.',
      criteria: [
        { name: 'Quality of Work', maxPoints: 25, description: 'Overall quality and completeness' },
        { name: 'Technical Implementation', maxPoints: 25, description: 'Technical skills and implementation' },
        { name: 'Documentation', maxPoints: 20, description: 'Documentation quality and completeness' },
        { name: 'Presentation', maxPoints: 15, description: 'Presentation and communication' },
        { name: 'Teamwork', maxPoints: 15, description: 'Collaboration and teamwork' }
      ],
      totalPoints: 100
    });
    setPhases([]);
    setSelectedCategory(null);
    setSelectedPhaseCategory({});
    setCurrentStep('project-setup');
    setCompletedSteps(new Set());
    setError('');
  };

  // Get current date for validation
  const getCurrentDateTime = () => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  };

  // Date calculation helper functions
  // Calculate evaluation start date (starts 1 minute after phase ends)
  // Keep in datetime-local format (no timezone) so backend interprets as local time
  const calculateEvaluationStartDate = (phaseEndDate) => {
    if (!phaseEndDate) return null;
    const phaseEnd = dayjs(phaseEndDate);
    // Evaluation starts 1 minute after phase ends
    return phaseEnd.add(1, 'minute').format('YYYY-MM-DDTHH:mm:ss.SSS');
  };

  // Calculate evaluation due date (full 24-hour periods for each day)
  // Keep in datetime-local format (no timezone) so backend interprets as local time
  const calculateEvaluationDueDate = (evaluationStartDate, evaluationDays) => {
    if (!evaluationStartDate || evaluationDays === undefined) return null;
    const start = dayjs(evaluationStartDate);
    // Add full 24-hour periods and subtract 1 minute to get the end time
    const dueDate = start.add(evaluationDays * 24, 'hour').subtract(1, 'minute');
    // Return in datetime-local format (no Z suffix)
    return dueDate.format('YYYY-MM-DDTHH:mm:ss.SSS');
  };

  // Calculate breathe phase end date
  const calculateBreathePhaseEnd = (evaluationDueDate, breatheDays) => {
    if (!evaluationDueDate) return null;
    if (breatheDays === 0) return evaluationDueDate;
    const evalEnd = dayjs(evaluationDueDate);
    // Breathe starts 1 minute after evaluation ends
    const breatheStart = evalEnd.add(1, 'minute');
    // Breathe ends after full 24-hour periods and subtract 1 minute
    return breatheStart.add(breatheDays * 24, 'hour').subtract(1, 'minute').format('YYYY-MM-DDTHH:mm:ss.SSS');
  };

  // Get minimum allowed date for next phase
  const getMinimumPhaseStartDate = (previousPhase, evaluationDays, breatheDays) => {
    if (!previousPhase || !previousPhase.endDate) return null;
    
    const phaseEnd = dayjs(previousPhase.endDate);
    // Evaluation starts 1 minute after phase ends
    const evalStart = phaseEnd.add(1, 'minute');
    // Evaluation ends after full evaluation duration (in hours)
    const evalEnd = evalStart.add(evaluationDays * 24, 'hour').subtract(1, 'minute');
    // Breathe phase starts 1 minute after evaluation ends
    const breatheStart = evalEnd.add(1, 'minute');
    // Breathe phase ends after full breathe duration (in hours)
    const breatheEnd = breatheDays > 0 
      ? breatheStart.add(breatheDays * 24, 'hour').subtract(1, 'minute')
      : evalEnd;
    // Next phase can start 1 minute after breathe phase ends
    const nextPhaseStart = breatheEnd.add(1, 'minute');
    
    return nextPhaseStart.toDate();
  };

  // Apply preset to populate project and phases
  const applyPreset = (preset) => {
    if (!preset || !formData.startDate) {
      alert('Please set a project start date first before applying a preset.');
      return;
    }
    
    // Set project title and description
    setFormData(prev => ({
      ...prev,
      title: preset.title,
      description: preset.description
    }));
    
    // Calculate phase dates based on preset
    const newPhases = [];
    let currentStart = dayjs(formData.startDate);
    
    preset.phases.forEach((phaseName, index) => {
      // Phase ends after the specified duration
      const phaseEnd = currentStart.add(presetPhaseDuration, 'day').subtract(1, 'minute');
      
      // Evaluation starts 1 minute after phase ends
      const evalStart = phaseEnd.add(1, 'minute');
      const evalDays = formData.evaluationPhaseDays || 1;
      // Evaluation ends after the full evaluation duration (in hours)
      const evalEnd = evalStart.add(evalDays * 24, 'hour').subtract(1, 'minute');
      
      // Breathe phase starts 1 minute after evaluation ends
      const breatheStart = evalEnd.add(1, 'minute');
      const breatheDays = formData.breathePhaseDays || 0;
      // Breathe phase ends after the full breathe duration (in hours)
      const breatheEnd = breatheDays > 0 
        ? breatheStart.add(breatheDays * 24, 'hour').subtract(1, 'minute')
        : evalEnd;
      
      newPhases.push({
        name: phaseName,
        description: `${phaseName} phase for ${preset.title}`,
        startDate: currentStart.format('YYYY-MM-DDTHH:mm'),
        endDate: phaseEnd.format('YYYY-MM-DDTHH:mm'),
        evaluationDeadline: evalEnd.format('YYYY-MM-DDTHH:mm'),
        breathePhaseEnd: breatheEnd.format('YYYY-MM-DDTHH:mm'),
        fileTypesAllowed: [],
        maxFileSizeMb: 10,
        phaseRubricType: '',
        phaseRubricFile: null,
        phaseRubric: {
          instructions: 'Your phase deliverable will be evaluated using the following criteria.',
          criteria: [
            { name: 'Completeness', maxPoints: 30, description: 'All requirements are met' },
            { name: 'Quality', maxPoints: 30, description: 'Work quality and attention to detail' },
            { name: 'Documentation', maxPoints: 20, description: 'Proper documentation provided' },
            { name: 'Timeliness', maxPoints: 20, description: 'Submitted on time' }
          ],
          totalPoints: 100
        },
        phaseEvaluationType: '',
        phaseEvaluationForm: null,
        phaseEvaluation: {
          criteria: [
            { name: 'Contribution', maxPoints: 20, description: 'Member contribution to this phase' },
            { name: 'Quality Work', maxPoints: 30, description: 'Quality of work delivered' },
            { name: 'Cooperation', maxPoints: 25, description: 'Cooperation with team members' },
            { name: 'Timeliness', maxPoints: 25, description: 'Meeting phase deadlines' }
          ],
          totalPoints: 100,
          instructions: 'Evaluate your groupmates for this phase.'
        }
      });
      
      // Next phase starts 1 minute after breathe phase ends
      currentStart = breatheEnd.add(1, 'minute');
    });
    
    // Calculate project due date (end of last phase's breathe period)
    if (newPhases.length > 0) {
      const lastPhase = newPhases[newPhases.length - 1];
      setFormData(prev => ({
        ...prev,
        dueDate: lastPhase.breathePhaseEnd
      }));
    }
    
    setPhases(newPhases);
    setSelectedPreset(preset);
    setShowPresetMode(false);
    setCurrentStep('phases');
    
    // Mark steps as completed
    setCompletedSteps(new Set(['project-setup', 'phases']));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileTypesChange = (selectedTypes) => {
    setFormData(prev => ({
      ...prev,
      fileTypesAllowed: selectedTypes
    }));
  };

  const handleSetSelectedPhaseCategory = (phaseIndex, category) => {
    const key = `${phaseIndex}-${category}`;
    setSelectedPhaseCategory(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePhaseFileTypesChange = (phaseIndex, fileType) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        const currentTypes = phase.file_types_allowed || [];
        return {
          ...phase,
          file_types_allowed: currentTypes.includes(fileType)
            ? currentTypes.filter(type => type !== fileType)
            : [...currentTypes, fileType]
        };
      }
      return phase;
    }));
  };

  const addPhase = () => {
    // Calculate start date based on previous phase and breathe phase days
    let startDate = '';
    if (phases.length > 0) {
      const lastPhase = phases[phases.length - 1];
      if (lastPhase.endDate) {
        const lastEndDate = new Date(lastPhase.endDate);
        const breatheDays = formData.breathePhaseDays || 0;
        const newStartDate = new Date(lastEndDate.getTime() + (breatheDays * 24 * 60 * 60 * 1000));
        // ✅ FIX: Use proper format function instead of toISOString() to preserve local time
        const year = newStartDate.getFullYear();
        const month = String(newStartDate.getMonth() + 1).padStart(2, '0');
        const day = String(newStartDate.getDate()).padStart(2, '0');
        const hours = String(newStartDate.getHours()).padStart(2, '0');
        const minutes = String(newStartDate.getMinutes()).padStart(2, '0');
        const seconds = String(newStartDate.getSeconds()).padStart(2, '0');
        const ms = String(newStartDate.getMilliseconds()).padStart(3, '0');
        startDate = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
      }
    } else if (formData.startDate) {
      // ✅ FIX: Strip Z from formData.startDate if present, so it's treated as local time
      startDate = formData.startDate.replace(/Z$/, '');
    }

    const newPhase = {
      name: '',
      description: '',
      startDate: startDate,
      endDate: '',
      file_types_allowed: [],
      max_attempts: 3,
      rubricType: '',
      rubricFile: null,
      rubric: {
        instructions: 'This phase will be evaluated using the following criteria. Each criterion has a maximum score, and your total grade is the sum of all criteria scores.',
        criteria: [
          { name: 'Quality of Work', maxPoints: 25, description: 'Overall quality and completeness' },
          { name: 'Technical Implementation', maxPoints: 25, description: 'Technical skills and implementation' },
          { name: 'Documentation', maxPoints: 20, description: 'Documentation quality and completeness' },
          { name: 'Presentation', maxPoints: 15, description: 'Presentation and communication' },
          { name: 'Teamwork', maxPoints: 15, description: 'Collaboration and teamwork' }
        ],
        totalPoints: 100
      },
      evaluation_form_type: '',
      evaluation_form: null,
      builtInEvaluation: {
        criteria: [
          { name: 'Contribution', maxPoints: 20, description: 'Contributes meaningfully to group discussions and project development' },
          { name: 'Compliance', maxPoints: 15, description: 'Completes group assignments and tasks on time' },
          { name: 'Quality Work', maxPoints: 25, description: 'Prepares work in a quality manner with attention to detail' },
          { name: 'Cooperation', maxPoints: 15, description: 'Demonstrates a cooperative and supportive attitude' },
          { name: 'Overall Performance', maxPoints: 25, description: 'Overall performance and leadership in the project' }
        ],
        totalPoints: 100,
        instructions: 'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.'
      }
    };
    setPhases(prev => [...prev, newPhase]);
  };

  const removePhase = (index) => {
    setPhases(prev => prev.filter((_, i) => i !== index));
  };

  const autoSetPhaseDates = () => {
    if (!formData.startDate || !formData.dueDate) {
      alert('Please set Project Start Date and Due Date first');
      return;
    }

    const startDate = dayjs(formData.startDate);
    let dueDate = dayjs(formData.dueDate);
    
    // If due date is at midnight (start of day), treat it as end of previous day (11:59 PM)
    // because buffers run until 11:59 PM, not 12:00 AM
    const isDueDateAtMidnight = dueDate.hour() === 0 && dueDate.minute() === 0 && dueDate.second() === 0;
    if (isDueDateAtMidnight) {
      dueDate = dueDate.subtract(1, 'second').endOf('day');
    }
    
    // Account for evaluation phase days needed after EVERY phase (including last)
    const evalDays = formData.evaluationPhaseDays || 0;
    const breatheDays = formData.breathePhaseDays || 0;
    const bufferDays = evalDays + breatheDays;
    
    const totalDays = dueDate.diff(startDate, 'day', true); // Use decimal days
    const numPhases = autoSetConfig.numberOfPhases;
    
    // Available days for phases = total days minus buffer needed after EACH phase
    const totalBufferDaysNeeded = numPhases * bufferDays;
    const availableForPhases = totalDays - totalBufferDaysNeeded;
    
    if (availableForPhases <= 0) {
      alert(`Not enough days! Need ${totalBufferDaysNeeded} days for evaluation/breathe phases (${bufferDays} days × ${numPhases} phases). Timeline is only ${Math.floor(totalDays)} days.`);
      return;
    }

    // Simple calculation: divide available days among phases
    let phaseDurationDays = autoSetConfig.phaseDurationDays;
    
    if (autoSetConfig.autoSpacePhases) {
      // Equally divide the available days for phases
      phaseDurationDays = Math.floor(availableForPhases / numPhases);
    }

    if (phaseDurationDays <= 0) {
      alert('Not enough days to create phases with current settings');
      return;
    }

    // Create phases
    const newPhases = [];
    let currentStart = startDate;

    for (let i = 0; i < numPhases; i++) {
      const isLastPhase = i === numPhases - 1;
      let phaseEnd;

      if (isLastPhase) {
        // Last phase: must end so that (phaseEnd + bufferDays) = dueDate
        // This ensures the buffer period ends exactly at the project deadline
        phaseEnd = dueDate.subtract(bufferDays, 'day').endOf('day');
      } else {
        // Regular phase: lasts phaseDurationDays from current start
        phaseEnd = currentStart.add(phaseDurationDays, 'day').endOf('day');
      }

      newPhases.push({
        name: `Phase ${i + 1}`,
        description: '',
        startDate: currentStart.format('YYYY-MM-DDTHH:mm:ss.SSS'),  // Use format() for datetime-local (no timezone)
        endDate: phaseEnd.format('YYYY-MM-DDTHH:mm:ss.SSS'),        // Use format() for datetime-local (no timezone)
        file_types_allowed: [],
        max_attempts: 3,
        rubricType: '',
        rubricFile: null,
        rubric: {
          instructions: 'This phase will be evaluated using the following criteria.',
          criteria: [
            { name: 'Quality of Work', maxPoints: 25, description: 'Overall quality and completeness' },
            { name: 'Technical Implementation', maxPoints: 25, description: 'Technical skills and implementation' },
            { name: 'Documentation', maxPoints: 20, description: 'Documentation quality and completeness' },
            { name: 'Presentation', maxPoints: 15, description: 'Presentation and communication' },
            { name: 'Teamwork', maxPoints: 15, description: 'Collaboration and teamwork' }
          ],
          totalPoints: 100
        },
        evaluation_form_type: 'builtin',
        builtInEvaluation: {
          criteria: [
            { name: 'Contribution', maxPoints: 20, description: 'Contributes meaningfully to group discussions' },
            { name: 'Compliance', maxPoints: 15, description: 'Completes group assignments on time' },
            { name: 'Quality Work', maxPoints: 25, description: 'Prepares work in a quality manner' },
            { name: 'Cooperation', maxPoints: 15, description: 'Demonstrates a cooperative and supportive attitude' },
            { name: 'Overall Performance', maxPoints: 25, description: 'Overall performance and leadership' }
          ],
          totalPoints: 100,
          instructions: 'Rate your groupmates according to the following criteria.'
        }
      });

      // Next phase starts after buffer period (evaluation + breathe)
      // phaseEnd + bufferDays brings us to end of breathe period
      // Then add 1 more day and set to midnight to get next phase start date
      currentStart = phaseEnd.add(bufferDays + 1, 'day').startOf('day');
    }

    setPhases(newPhases);
    setShowAutoSetModal(false);
  };

  const updatePhase = (index, field, value) => {
    console.log(`✏️ updatePhase called: index=${index}, field=${field}, value=${value}`);
    setPhases(prev => prev.map((phase, i) => {
      if (i === index) {
        const updated = { ...phase, [field]: value };
        console.log(`✏️ Phase ${index} ${field} updated in state:`, updated[field]);
        return updated;
      }
      return phase;
    }));
  };

  const calculateEvaluationDeadline = (phaseIndex, phaseEndDate) => {
    if (!phaseEndDate) return '';
    
    const endDate = new Date(phaseEndDate);
    // Set evaluation deadline to the same as phase end date (before project ends, not after)
    
    return endDate.toISOString().slice(0, 16);
  };

  const getMinStartDate = (phaseIndex) => {
    if (phaseIndex === 0) return formData.startDate;
    
    const previousPhase = phases[phaseIndex - 1];
    if (!previousPhase?.endDate) return '';
    
    const previousEndDate = new Date(previousPhase.endDate);
    const breatheDays = formData.breathePhaseDays || 0;
    const minStartDate = new Date(previousEndDate.getTime() + (breatheDays * 24 * 60 * 60 * 1000));
    
    return minStartDate.toISOString().slice(0, 16);
  };

  const getMinProjectDueDate = () => {
    if (phases.length === 0) return '';
    
    // Get the end date of the final phase
    const finalPhase = phases[phases.length - 1];
    if (!finalPhase?.endDate) return '';
    
    const finalPhaseEndDate = dayjs(finalPhase.endDate);
    const totalBufferDays = (formData.evaluationPhaseDays || 0) + (formData.breathePhaseDays || 0);
    const minDueDate = finalPhaseEndDate.add(totalBufferDays, 'day').endOf('day');
    
    return minDueDate.toISOString();
  };

  const handleFileUpload = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const handlePhaseFileUpload = (phaseIndex, field, file) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          [field]: file
        };
      }
      return phase;
    }));
  };

  // Handle built-in evaluation form updates
  const updateBuiltInEvaluationCriterion = (index, field, value) => {
    const updatedCriteria = [...(builtInEvaluation?.criteria || [])];
    updatedCriteria[index][field] = value;
    
    // Recalculate total points
    const totalPoints = updatedCriteria.reduce((sum, criterion) => 
      sum + (parseFloat(criterion.maxPoints) || 0), 0
    );

    setBuiltInEvaluation({
      ...(builtInEvaluation || {}),
      criteria: updatedCriteria,
      totalPoints
    });
  };

  const addBuiltInEvaluationCriterion = () => {
    const newCriterion = {
      name: 'New Criterion',
      maxPoints: 10,
      description: ''
    };
    
    const updatedCriteria = [...(builtInEvaluation?.criteria || []), newCriterion];
    const totalPoints = updatedCriteria.reduce((sum, criterion) => 
      sum + (parseFloat(criterion.maxPoints) || 0), 0
    );

    setBuiltInEvaluation({
      ...(builtInEvaluation || {}),
      criteria: updatedCriteria,
      totalPoints
    });
  };

  const removeBuiltInEvaluationCriterion = (index) => {
    const updatedCriteria = (builtInEvaluation?.criteria || []).filter((_, i) => i !== index);
    const totalPoints = updatedCriteria.reduce((sum, criterion) => 
      sum + (parseFloat(criterion.maxPoints) || 0), 0
    );

    setBuiltInEvaluation({
      ...(builtInEvaluation || {}),
      criteria: updatedCriteria,
      totalPoints
    });
  };

  const clearBuiltInEvaluationCriteria = () => {
    setBuiltInEvaluation({
      ...builtInEvaluation,
      criteria: [],
      instructions: '',
      totalPoints: 0
    });
  };

  const restoreBuiltInEvaluationDefaults = () => {
    setBuiltInEvaluation({
      instructions: 'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.',
      criteria: [
        { name: 'Contribution', maxPoints: 20, description: 'Contributes meaningfully to group discussions and project development' },
        { name: 'Compliance', maxPoints: 15, description: 'Completes group assignments and tasks on time' },
        { name: 'Quality Work', maxPoints: 25, description: 'Prepares work in a quality manner with attention to detail' },
        { name: 'Cooperation', maxPoints: 15, description: 'Demonstrates a cooperative and supportive attitude' },
        { name: 'Overall Performance', maxPoints: 25, description: 'Overall performance and leadership in the project' }
      ],
      totalPoints: 100
    });
  };

  // Step navigation functions
  const steps = [
    { 
      id: 'project-setup', 
      title: 'Project Setup', 
      icon: '📝',
      subsections: [
        { id: 'project-info', title: 'Project Information', completed: () => formData.title && formData.description && formData.startDate && formData.dueDate && formData.evaluationPhaseDays > 0 },
        { id: 'project-config', title: 'Project Configuration', completed: () => formData.minTasksPerMember && formData.maxTasksPerMember },
        { id: 'project-rubric', title: 'Project Rubric', completed: () => formData.projectRubricType === 'upload' ? formData.projectRubricFile : (formData.projectRubricType === 'builtin' ? projectRubric?.criteria?.length >= 2 : true) },
        { id: 'project-evaluation', title: 'Project Evaluation', completed: () => formData.projectEvaluationType === 'custom' ? formData.projectEvaluationForm : (formData.projectEvaluationType === 'builtin' ? builtInEvaluation?.criteria?.length >= 2 : true) }
      ]
    },
    { 
      id: 'phases', 
      title: 'Phase Management', 
      icon: '📋',
      subsections: [
        { id: 'phases-list', title: 'Phase Details', completed: () => phases.length > 0 && phases.every(phase => phase.name && phase.description && phase.startDate && phase.endDate) }
      ]
    }
  ];

  const handleStepClick = (stepId) => {
    // Check if trying to access phases before project setup is complete
    if (stepId === 'phases' && !checkStepCompletion('project-setup')) {
      return; // Don't allow access to phases if project setup isn't complete
    }
    setCurrentStep(stepId);
  };

  const checkStepCompletion = (stepId) => {
    switch (stepId) {
      case 'project-setup':
        return formData.title && formData.description && formData.startDate && formData.dueDate &&
               formData.minTasksPerMember && 
               formData.maxTasksPerMember &&
               formData.evaluationPhaseDays !== undefined && formData.evaluationPhaseDays > 0 &&
               formData.projectRubricType && // Must select a rubric type
               formData.projectEvaluationType && // Must select an evaluation type
               (formData.projectRubricType === 'upload' ? formData.projectRubricFile : true) &&
               (formData.projectRubricType === 'builtin' ? projectRubric?.criteria?.length >= 2 : true) &&
               (formData.projectEvaluationType === 'builtin' ? builtInEvaluation?.criteria?.length >= 2 : true) &&
               (formData.projectEvaluationType === 'custom' ? formData.projectEvaluationForm : true);
      case 'phases':
        return phases.length > 0 && phases.every(phase => 
          phase.name && phase.description && phase.startDate && phase.endDate
        );
      default:
        return false;
    }
  };

  // Check if the last phase is complete and ready for a new phase to be added
  const canAddNewPhase = () => {
    if (phases.length === 0) return true; // Can add first phase
    
    const lastPhase = phases[phases.length - 1];
    
    // All fields must be filled
    return (
      lastPhase.name &&
      lastPhase.description &&
      lastPhase.startDate &&
      lastPhase.endDate &&
      lastPhase.rubricType && // Must have selected a rubric type
      lastPhase.evaluation_form_type && // Must have selected an evaluation type
      (lastPhase.rubricType === 'upload' ? lastPhase.rubricFile : true) && // If upload, must have file
      (lastPhase.evaluation_form_type === 'custom' ? lastPhase.evaluation_form : true) // If custom, must have file
    );
  };

  const isAllStepsCompleted = () => {
    // Check if all steps are completed
    const allStepsComplete = steps.every(step => checkStepCompletion(step.id));
    
    // Also check that all phases have both rubric type and evaluation form type selected
    const allPhasesHaveRubricAndEvaluation = phases.every(phase => 
      phase.rubricType && phase.evaluation_form_type
    );
    
    return allStepsComplete && allPhasesHaveRubricAndEvaluation;
  };

  const updateStepCompletion = () => {
    const newCompletedSteps = new Set();
    steps.forEach(step => {
      if (checkStepCompletion(step.id)) {
        newCompletedSteps.add(step.id);
      }
    });
    setCompletedSteps(newCompletedSteps);
  };

  // Project Rubric Builder Functions
  const updateProjectRubricCriterion = (index, field, value) => {
    const updatedCriteria = [...(projectRubric?.criteria || [])];
    updatedCriteria[index][field] = value;
    
    const totalPoints = updatedCriteria.reduce((sum, criterion) => 
      sum + (parseFloat(criterion.maxPoints) || 0), 0
    );

    setProjectRubric({
      ...(projectRubric || {}),
      criteria: updatedCriteria,
      totalPoints
    });
  };

  const addProjectRubricCriterion = () => {
    const newCriterion = {
      name: 'New Criterion',
      maxPoints: 10,
      description: ''
    };
    
    const updatedCriteria = [...(projectRubric?.criteria || []), newCriterion];
    const totalPoints = updatedCriteria.reduce((sum, criterion) => 
      sum + (parseFloat(criterion.maxPoints) || 0), 0
    );

    setProjectRubric({
      ...(projectRubric || {}),
      criteria: updatedCriteria,
      totalPoints
    });
  };

  const removeProjectRubricCriterion = (index) => {
    const updatedCriteria = (projectRubric?.criteria || []).filter((_, i) => i !== index);
    const totalPoints = updatedCriteria.reduce((sum, criterion) => 
      sum + (parseFloat(criterion.maxPoints) || 0), 0
    );

    setProjectRubric({
      ...(projectRubric || {}),
      criteria: updatedCriteria,
      totalPoints
    });
  };

  const clearProjectRubricCriteria = () => {
    setProjectRubric({
      ...(projectRubric || {}),
      criteria: [],
      instructions: '',
      totalPoints: 0
    });
  };

  const restoreProjectRubricDefaults = () => {
    setProjectRubric({
      instructions: 'Your project will be evaluated using the following criteria. Each criterion has a maximum score, and your total grade is the sum of all criteria scores.',
      criteria: [
        { name: 'Quality of Work', maxPoints: 25, description: 'Overall quality and completeness' },
        { name: 'Technical Implementation', maxPoints: 25, description: 'Technical skills and implementation' },
        { name: 'Documentation', maxPoints: 20, description: 'Documentation quality and completeness' },
        { name: 'Presentation', maxPoints: 15, description: 'Presentation and communication' },
        { name: 'Teamwork', maxPoints: 15, description: 'Collaboration and teamwork' }
      ],
      totalPoints: 100
    });
  };

  // Phase Rubric Functions
  const updatePhaseRubricCriterion = (phaseIndex, criterionIndex, field, value) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        const updatedCriteria = [...(phase.rubric?.criteria || [])];
        updatedCriteria[criterionIndex][field] = value;
        
        const totalPoints = updatedCriteria.reduce((sum, criterion) => 
          sum + (parseFloat(criterion.maxPoints) || 0), 0
        );

        return {
          ...phase,
          rubric: {
            ...(phase.rubric || {}),
            criteria: updatedCriteria,
            totalPoints
          }
        };
      }
      return phase;
    }));
  };

  const addPhaseRubricCriterion = (phaseIndex) => {
    const newCriterion = {
      name: 'New Criterion',
      maxPoints: 10,
      description: ''
    };
    
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        const updatedCriteria = [...(phase.rubric?.criteria || []), newCriterion];
        const totalPoints = updatedCriteria.reduce((sum, criterion) => 
          sum + (parseFloat(criterion.maxPoints) || 0), 0
        );

        return {
          ...phase,
          rubric: {
            ...(phase.rubric || {}),
            criteria: updatedCriteria,
            totalPoints
          }
        };
      }
      return phase;
    }));
  };

  const clearPhaseRubricCriteria = (phaseIndex) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          rubric: {
            ...(phase.rubric || {}),
            criteria: [],
            instructions: '',
            totalPoints: 0
          }
        };
      }
      return phase;
    }));
  };

  const restorePhaseRubricDefaults = (phaseIndex) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          rubric: {
            ...(phase.rubric || {}),
            instructions: 'This phase will be evaluated using the following criteria. Each criterion has a maximum score, and your total grade is the sum of all criteria scores.',
            criteria: [
              { name: 'Quality of Work', maxPoints: 25, description: 'Overall quality and completeness' },
              { name: 'Technical Implementation', maxPoints: 25, description: 'Technical skills and implementation' },
              { name: 'Documentation', maxPoints: 20, description: 'Documentation quality and completeness' },
              { name: 'Presentation', maxPoints: 15, description: 'Presentation and communication' },
              { name: 'Teamwork', maxPoints: 15, description: 'Collaboration and teamwork' }
            ],
            totalPoints: 100
          }
        };
      }
      return phase;
    }));
  };

  const removePhaseRubricCriterion = (phaseIndex, criterionIndex) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        const updatedCriteria = (phase.rubric?.criteria || []).filter((_, i) => i !== criterionIndex);
        const totalPoints = updatedCriteria.reduce((sum, criterion) => 
          sum + (parseFloat(criterion.maxPoints) || 0), 0
        );

        return {
          ...phase,
          rubric: {
            ...(phase.rubric || {}),
            criteria: updatedCriteria,
            totalPoints
          }
        };
      }
      return phase;
    }));
  };

  // Phase Evaluation Functions
  const updatePhaseEvaluationCriterion = (phaseIndex, criterionIndex, field, value) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        const updatedCriteria = [...(phase.builtInEvaluation?.criteria || [])];
        updatedCriteria[criterionIndex][field] = value;
        
        const totalPoints = updatedCriteria.reduce((sum, criterion) => 
          sum + (parseFloat(criterion.maxPoints) || 0), 0
        );

        return {
          ...phase,
          builtInEvaluation: {
            ...(phase.builtInEvaluation || {}),
            criteria: updatedCriteria,
            totalPoints
          }
        };
      }
      return phase;
    }));
  };

  const addPhaseEvaluationCriterion = (phaseIndex) => {
    const newCriterion = {
      name: 'New Criterion',
      maxPoints: 10,
      description: ''
    };
    
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        const updatedCriteria = [...(phase.builtInEvaluation?.criteria || []), newCriterion];
        const totalPoints = updatedCriteria.reduce((sum, criterion) => 
          sum + (parseFloat(criterion.maxPoints) || 0), 0
        );

        return {
          ...phase,
          builtInEvaluation: {
            ...(phase.builtInEvaluation || {}),
            criteria: updatedCriteria,
            totalPoints
          }
        };
      }
      return phase;
    }));
  };

  const clearPhaseEvaluationCriteria = (phaseIndex) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          builtInEvaluation: {
            ...(phase.builtInEvaluation || {}),
            criteria: [],
            instructions: '',
            totalPoints: 0
          }
        };
      }
      return phase;
    }));
  };

  const restorePhaseEvaluationDefaults = (phaseIndex) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        return {
          ...phase,
          builtInEvaluation: {
            ...(phase.builtInEvaluation || {}),
            instructions: 'Rate your groupmates according to the following criteria. Use the point scale provided for each criterion.',
            criteria: [
              { name: 'Contribution', maxPoints: 20, description: 'Contributes meaningfully to group discussions and project development' },
              { name: 'Compliance', maxPoints: 15, description: 'Completes group assignments and tasks on time' },
              { name: 'Quality Work', maxPoints: 25, description: 'Prepares work in a quality manner with attention to detail' },
              { name: 'Cooperation', maxPoints: 15, description: 'Demonstrates a cooperative and supportive attitude' },
              { name: 'Overall Performance', maxPoints: 25, description: 'Overall performance and leadership in the project' }
            ],
            totalPoints: 100
          }
        };
      }
      return phase;
    }));
  };

  const removePhaseEvaluationCriterion = (phaseIndex, criterionIndex) => {
    setPhases(prev => prev.map((phase, index) => {
      if (index === phaseIndex) {
        const updatedCriteria = (phase.builtInEvaluation?.criteria || []).filter((_, i) => i !== criterionIndex);
        const totalPoints = updatedCriteria.reduce((sum, criterion) => 
          sum + (parseFloat(criterion.maxPoints) || 0), 0
        );

        return {
          ...phase,
          builtInEvaluation: {
            ...(phase.builtInEvaluation || {}),
            criteria: updatedCriteria,
            totalPoints
          }
        };
      }
      return phase;
    }));
  };

  // Update completion status when form data changes
  React.useEffect(() => {
    updateStepCompletion();
  }, [formData, phases, builtInEvaluation, projectRubric]);

  // Update phase start dates when breathe phase days change
  React.useEffect(() => {
    if (phases.length > 1) {
      setPhases(prevPhases => prevPhases.map((phase, index) => {
        if (index === 0) return phase; // Don't change first phase
        
        const previousPhase = prevPhases[index - 1];
        if (previousPhase?.endDate) {
          const previousEndDate = new Date(previousPhase.endDate);
          const breatheDays = formData.breathePhaseDays || 0;
          const newStartDate = new Date(previousEndDate.getTime() + (breatheDays * 24 * 60 * 60 * 1000));
          
          // Use format() instead of toISOString() to preserve local time
          const formatDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const seconds = String(date.getSeconds()).padStart(2, '0');
            const ms = String(date.getMilliseconds()).padStart(3, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
          };
          
          return {
            ...phase,
            startDate: formatDate(newStartDate)
          };
        }
        return phase;
      }));
    }
  }, [formData.breathePhaseDays]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 'project-setup':
        return (
          <div className="step-content">
            <h3>Project Setup</h3>
            <hr style={{ border: 'none', borderTop: '1px solid #EBE5C2', margin: '12px 0 20px 0' }} />
            
            {/* Project Information */}
            <div className="form-section">
            
              <div className="form-group">
                <label>Project Title <span style={{color: 'red'}}>*</span></label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter project title"
                required
              />
            </div>

              <div className="form-group">
                <label>Project Description <span style={{color: 'red'}}>*</span></label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe the project requirements and objectives"
                rows={4}
                required
              />
            </div>

            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                  <label>Start Date <span style={{color: 'red'}}>*</span></label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      value={formData.startDate ? dayjs(formData.startDate) : null}
                      onChange={(newValue) => handleInputChange('startDate', newValue ? newValue.toISOString() : '')}
                      minDateTime={dayjs()}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          style: { width: '100%' }
                        }
                      }}
                    />
                  </LocalizationProvider>
                </div>
                
                <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                  <label>Due Date <span style={{color: 'red'}}>*</span></label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      value={formData.dueDate ? dayjs(formData.dueDate) : null}
                      onChange={(newValue) => handleInputChange('dueDate', newValue ? newValue.toISOString() : '')}
                      minDateTime={formData.startDate ? dayjs(formData.startDate).add(1, 'minute') : dayjs()}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          size: 'small',
                          style: { width: '100%' }
                        }
                      }}
                    />
                  </LocalizationProvider>
                  {getMinProjectDueDate() && phases.length > 0 && (
                    <small className="help-text" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <Calendar size={16} style={{ marginTop: '2px', flexShrink: 0, color: '#34656D' }} />
                        <div>
                          <strong>Timeline summary:</strong>
                          <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                            Final phase ends {dayjs(phases[phases.length - 1].endDate).format('MMM DD')} at {dayjs(phases[phases.length - 1].endDate).format('h:mm A')}, 
                            then {formData.evaluationPhaseDays || 0} day{(formData.evaluationPhaseDays || 0) > 1 ? 's' : ''} for peer feedback + {formData.breathePhaseDays || 0} day{(formData.breathePhaseDays || 0) > 1 ? 's' : ''} for rest
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#666', paddingLeft: '24px' }}>
                        <Info size={14} style={{ marginTop: '1px', flexShrink: 0 }} />
                        <div>
                          Buffer ends: {dayjs(getMinProjectDueDate()).format('MMM DD, YYYY h:mm A')}
                        </div>
                      </div>
                    </small>
                  )}
                </div>
            </div>

            <div className="form-group">
              <label>Evaluation Phase Days <span style={{color: 'red'}}>*</span></label>
              <input
                type="number"
                min="1"
                max="30"
                value={formData.evaluationPhaseDays || ''}
                onChange={(e) => handleInputChange('evaluationPhaseDays', e.target.value === '' ? 0 : parseInt(e.target.value))}
              />
              <small className="help-text">
                Days for peer evaluation after each phase ends (starts day after phase end)
              </small>
            </div>

            {/* Breathe Phase Days */}
            <div className="form-group">
              <label>Breathe Phase Days</label>
              <input
                type="number"
                min="0"
                max="30"
                value={formData.breathePhaseDays || ''}
                onChange={(e) => handleInputChange('breathePhaseDays', e.target.value === '' ? 0 : parseInt(e.target.value))}
              />
              <small className="help-text">
                Number of days between phases for students to rest and prepare
              </small>
            </div>
          </div>

            {/* Project Configuration */}
          <div className="form-section">
              <h4>Project Configuration</h4>
              <hr style={{ border: 'none', borderTop: '1px solid #EBE5C2', margin: '12px 0 20px 0' }} />
            
              {/* File Types */}
              <div className="form-group">
                <label>Allowed File Types</label>
                <div className="file-types-container">
                  <div className="file-types-layout">
                    <div className="categories-panel">
                      <div className="categories-list">
                        {Object.entries(fileTypeCategories).map(([category, types]) => {
                          const selectedCount = Array.isArray(formData.fileTypesAllowed) ? 
                            types.filter(type => formData.fileTypesAllowed.includes(type)).length : 0;
                          const isOpen = selectedCategory === category;
                          return (
                            <div 
                              key={category} 
                              className={`category-item ${selectedCount > 0 ? 'has-selection' : ''} ${isOpen ? 'active' : ''}`}
                              onClick={() => setSelectedCategory(isOpen ? null : category)}
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
                              const isSelected = Array.isArray(formData.fileTypesAllowed) && 
                                               formData.fileTypesAllowed.includes(type);
                              return (
                                <label key={type} className={`file-type-option ${isSelected ? 'selected' : ''}`}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      const currentTypes = Array.isArray(formData.fileTypesAllowed) ? 
                                                        formData.fileTypesAllowed : [];
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
                      {Array.isArray(formData.fileTypesAllowed) && formData.fileTypesAllowed.length > 0 ? (
                        <span className="selected-count">
                          {formData.fileTypesAllowed.length} file types ({formData.fileTypesAllowed.join(', ')})
                        </span>
                      ) : (
                        <span className="no-selection">No Restriction - Any File Accepted</span>
                      )}
                    </div>
                    {Array.isArray(formData.fileTypesAllowed) && formData.fileTypesAllowed.length > 0 && (
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

          {/* Task Requirements */}
              <div className="form-row">
                <div className="form-group">
                  <label>Min Tasks Per Member <span style={{color: 'red'}}>*</span></label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.minTasksPerMember}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    if (value >= 1) {
                      handleInputChange('minTasksPerMember', value);
                    }
                  }}
                />
              </div>

                <div className="form-group">
                  <label>Max Tasks Per Member <span style={{color: 'red'}}>*</span></label>
                <input
                  type="number"
                  min="1"
                  placeholder="1"
                  value={formData.maxTasksPerMember}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    if (value >= 1) {
                      handleInputChange('maxTasksPerMember', value);
                    }
                  }}
                />
              </div>
            </div>

              {/* Project Rubric and Evaluation */}
              <div className="form-row">
                <div className="form-group">
                  <label>Project Rubric <span style={{color: 'red'}}>*</span></label>
                  <select
                    value={formData.projectRubricType}
                    onChange={(e) => handleInputChange('projectRubricType', e.target.value)}
                  >
                    <option value="">-- Select Rubric Type --</option>
                    <option value="builtin">Built-in Rubric</option>
                    <option value="upload">Upload Rubric File</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Project Evaluation <span style={{color: 'red'}}>*</span></label>
                  <select
                    value={formData.projectEvaluationType}
                    onChange={(e) => handleInputChange('projectEvaluationType', e.target.value)}
                  >
                    <option value="">-- Select Evaluation Type --</option>
                    <option value="builtin">Built-in Evaluation Form</option>
                    <option value="custom">Custom Evaluation Form</option>
                  </select>
                </div>
              </div>
                
              {/* Project Rubric Upload */}
              {formData.projectRubricType === 'upload' && (
                <div className="form-group">
                  <label>Rubric File</label>
                  <div className="modern-file-upload">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => handleFileUpload('projectRubricFile', e.target.files[0])}
                      className="file-input"
                      id="projectRubricFile"
                    />
                    <label htmlFor="projectRubricFile" className="file-upload-label">
                      {formData.projectRubricFile ? (
                        <div className="file-selected">
                          <FileText size={20} />
                          <div className="file-details">
                            <span className="file-name">{formData.projectRubricFile.name}</span>
                            <span className="file-size">{(formData.projectRubricFile.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          <button 
                            type="button" 
                            className="remove-file-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileUpload('projectRubricFile', null);
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="file-placeholder">
                          <Upload size={24} />
                          <span>Click to upload rubric file</span>
                          <small>PDF, DOC, DOCX, TXT files accepted</small>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Project Evaluation Upload */}
              {formData.projectEvaluationType === 'custom' && (
                <div className="form-group">
                  <label>Evaluation Form File</label>
                  <div className="modern-file-upload">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => handleFileUpload('projectEvaluationForm', e.target.files[0])}
                      className="file-input"
                      id="projectEvaluationForm"
                    />
                    <label htmlFor="projectEvaluationForm" className="file-upload-label">
                      {formData.projectEvaluationForm ? (
                        <div className="file-selected">
                          <FileText size={20} />
                          <div className="file-details">
                            <span className="file-name">{formData.projectEvaluationForm.name}</span>
                            <span className="file-size">{(formData.projectEvaluationForm.size / 1024 / 1024).toFixed(2)} MB</span>
                          </div>
                          <button 
                            type="button" 
                            className="remove-file-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFileUpload('projectEvaluationForm', null);
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="file-placeholder">
                          <Upload size={24} />
                          <span>Click to upload evaluation form</span>
                          <small>PDF, DOC, DOCX, TXT files accepted</small>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              )}

              {/* Project Rubric and Evaluation Builders */}
              <div className={`builders-container ${(formData.projectRubricType === 'builtin' && formData.projectEvaluationType === 'builtin') ? '' : 'single-builder'}`}>
                {/* Project Rubric Builder */}
                {formData.projectRubricType === 'builtin' && (
                  <div className="builder-section">
                    <div className="builder-header">
                      <h5>Project Rubric Builder</h5>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={addProjectRubricCriterion}
                          title="Add Criterion"
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={clearProjectRubricCriteria}
                          disabled={!projectRubric?.criteria || projectRubric.criteria.length === 0}
                          title="Clear All"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={restoreProjectRubricDefaults}
                          title="Restore Defaults"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Rubric Instructions</label>
                      <textarea
                        value={projectRubric.instructions}
                        onChange={(e) => setProjectRubric(prev => ({...prev, instructions: e.target.value}))}
                        placeholder="Your project will be evaluated using the criteria below. Each criterion has a maximum score, and your total grade is the sum of all criteria scores."
                        rows={3}
                        className="modern-textarea"
                      />
                    </div>

                    <div className="rubric-total">
                      <strong>Total Points: {projectRubric.totalPoints}</strong>
                      {projectRubric.criteria.length < 2 && (
                        <div className="validation-warning">
                          <AlertCircle size={16} />
                          <span>At least 2 criteria are required for the rubric</span>
                        </div>
                      )}
                    </div>

                    <div className="rubric-criteria-grid">
                      {projectRubric.criteria.map((criterion, index) => (
                        <div key={index} className="modern-rubric-card">
                          <div className="rubric-header">
                            <div className="criterion-name-group">
                              <input
                                type="text"
                                value={criterion.name}
                                onChange={(e) => updateProjectRubricCriterion(index, 'name', e.target.value)}
                                className="modern-input criterion-name"
                                placeholder="Criterion name"
                              />
                              <div className="rubric-points">
                                <input
                                  type="number"
                                  min="0"
                                  value={criterion.maxPoints}
                                  onChange={(e) => updateProjectRubricCriterion(index, 'maxPoints', parseFloat(e.target.value) || 0)}
                                  className="modern-input points-input"
                                />
                                <span>pts</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn-icon danger"
                              onClick={() => removeProjectRubricCriterion(index)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <textarea
                            value={criterion.description}
                            onChange={(e) => updateProjectRubricCriterion(index, 'description', e.target.value)}
                            placeholder="Describe this criterion"
                            rows={2}
                            className="modern-textarea"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Project Evaluation Builder */}
                {formData.projectEvaluationType === 'builtin' && (
                  <div className="builder-section">
                    <div className="builder-header">
                      <h5>Project Evaluation Builder</h5>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={addBuiltInEvaluationCriterion}
                          title="Add Criterion"
                        >
                          <Plus size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={clearBuiltInEvaluationCriteria}
                          disabled={builtInEvaluation.criteria.length === 0}
                          title="Clear All"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={restoreBuiltInEvaluationDefaults}
                          title="Restore Defaults"
                        >
                          <RotateCcw size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Evaluation Instructions</label>
                      <textarea
                        value={builtInEvaluation.instructions}
                        onChange={(e) => setBuiltInEvaluation(prev => ({...prev, instructions: e.target.value}))}
                        placeholder="Please evaluate your groupmates using the criteria below. Be fair and constructive in your feedback."
                        rows={3}
                        className="modern-textarea"
                      />
                    </div>

                    <div className="evaluation-total">
                      <strong>Total Points: {builtInEvaluation.totalPoints}</strong>
                      {builtInEvaluation.criteria.length < 2 && (
                        <div className="validation-warning">
                          <AlertCircle size={16} />
                          <span>At least 2 criteria are required for the evaluation form</span>
                        </div>
                      )}
                    </div>

                    <div className="evaluation-criteria-grid">
                      {builtInEvaluation.criteria.map((criterion, index) => (
                        <div key={index} className="modern-evaluation-card">
                          <div className="evaluation-header">
                            <div className="criterion-name-group">
                              <input
                                type="text"
                                value={criterion.name}
                                onChange={(e) => updateBuiltInEvaluationCriterion(index, 'name', e.target.value)}
                                className="modern-input criterion-name"
                                placeholder="Criterion name"
                              />
                              <div className="evaluation-points">
                                <input
                                  type="number"
                                  min="0"
                                  value={criterion.maxPoints}
                                  onChange={(e) => updateBuiltInEvaluationCriterion(index, 'maxPoints', parseFloat(e.target.value) || 0)}
                                  className="modern-input points-input"
                                />
                                <span>pts</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn-icon danger"
                              onClick={() => removeBuiltInEvaluationCriterion(index)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <textarea
                            value={criterion.description}
                            onChange={(e) => updateBuiltInEvaluationCriterion(index, 'description', e.target.value)}
                            placeholder="Describe this evaluation criterion"
                            rows={2}
                            className="modern-textarea"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'phases':
        return (
          <div className="step-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3>Phase Management</h3>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setShowAutoSetModal(true)}
                style={{ padding: '8px 16px', fontSize: '14px' }}
              >
                Auto-Set Dates
              </button>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #EBE5C2', margin: '12px 0 20px 0' }} />
            
            <div className="phases-section">

            {phases.map((phase, index) => (
              <React.Fragment key={index}>
              <div className="phase-card">
                <div className="phase-header">
                    <h4>Phase {index + 1}</h4>
                  <button
                    type="button"
                    className="btn-icon danger"
                    onClick={() => removePhase(index)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="form-row">
                    <div className="form-group">
                      <label>Phase Name <span style={{color: 'red'}}>*</span></label>
                  <input
                    type="text"
                        value={phase.name}
                        onChange={(e) => updatePhase(index, 'name', e.target.value)}
                        placeholder="e.g., Planning Phase"
                  />
                </div>
                </div>

                  <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
                    <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                    <label>Start Date <span style={{color: 'red'}}>*</span></label>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DateTimePicker
                        value={phase.startDate ? dayjs(phase.startDate) : null}
                        onChange={(newValue) => {
                          console.log(`📅 Phase ${index + 1} DateTimePicker onChange:`, {
                            newValue: newValue ? newValue.toISOString() : null,
                            formatted: newValue ? newValue.format('YYYY-MM-DDTHH:mm:ss.SSS') : '',
                            dayjsObject: newValue ? { year: newValue.year(), month: newValue.month() + 1, date: newValue.date(), hour: newValue.hour(), minute: newValue.minute() } : null
                          });
                          updatePhase(index, 'startDate', newValue ? newValue.format('YYYY-MM-DDTHH:mm:ss.SSS') : '');
                        }}
                        minDateTime={
                          index === 0 
                            ? (formData.startDate ? dayjs(formData.startDate) : dayjs())
                            : (phases[index - 1]?.endDate 
                                ? dayjs(getMinimumPhaseStartDate(phases[index - 1], formData.evaluationPhaseDays, formData.breathePhaseDays))
                                : dayjs())
                        }
                        maxDateTime={formData.dueDate ? dayjs(formData.dueDate) : undefined}
                        disabled={index > 0 && !phases[index - 1]?.endDate}
                        shouldDisableDate={(date) => {
                          if (index === 0) return false;
                          const minDate = getMinimumPhaseStartDate(
                            phases[index - 1],
                            formData.evaluationPhaseDays,
                            formData.breathePhaseDays
                          );
                          return minDate && dayjs(date).isBefore(dayjs(minDate), 'day');
                        }}
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            style: { width: '100%', opacity: (index > 0 && !phases[index - 1]?.endDate) ? 0.5 : 1 }
                          }
                        }}
                      />
                    </LocalizationProvider>
                    {index > 0 && !phases[index - 1]?.endDate && (
                      <small className="help-text">
                        Complete the previous phase's end date first
                      </small>
                    )}
                    {index > 0 && phases[index - 1]?.endDate && (formData.evaluationPhaseDays > 0 || formData.breathePhaseDays > 0) && (
                      <small className="help-text" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <Calendar size={16} style={{ marginTop: '2px', flexShrink: 0, color: '#34656D' }} />
                          <div>
                            <strong>Earliest this phase can start:</strong>
                            <div style={{ fontSize: '13px', color: '#555', marginTop: '4px' }}>
                              {dayjs(getMinimumPhaseStartDate(phases[index - 1], formData.evaluationPhaseDays, formData.breathePhaseDays)).format('MMM DD, YYYY')} at {dayjs(getMinimumPhaseStartDate(phases[index - 1], formData.evaluationPhaseDays, formData.breathePhaseDays)).format('h:mm A')}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#666', paddingLeft: '24px' }}>
                          <Info size={14} style={{ marginTop: '1px', flexShrink: 0 }} />
                          <div>
                            Previous phase needs {formData.evaluationPhaseDays} day{formData.evaluationPhaseDays > 1 ? 's' : ''} for peer feedback, then {formData.breathePhaseDays} day{formData.breathePhaseDays > 1 ? 's' : ''} for students to rest
                          </div>
                        </div>
                      </small>
                    )}
                  </div>

                    <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
                    <label>End Date <span style={{color: 'red'}}>*</span></label>
                    <LocalizationProvider dateAdapter={AdapterDayjs}>
                      <DateTimePicker
                        value={phase.endDate ? dayjs(phase.endDate) : null}
                        onChange={(newValue) => {
                          console.log(`📅 Phase ${index + 1} END DateTimePicker onChange:`, {
                            newValue: newValue ? newValue.toISOString() : null,
                            formatted: newValue ? newValue.format('YYYY-MM-DDTHH:mm:ss.SSS') : '',
                            dayjsObject: newValue ? { year: newValue.year(), month: newValue.month() + 1, date: newValue.date(), hour: newValue.hour(), minute: newValue.minute() } : null
                          });
                          updatePhase(index, 'endDate', newValue ? newValue.format('YYYY-MM-DDTHH:mm:ss.SSS') : '');
                        }}
                        minDateTime={phase.startDate ? dayjs(phase.startDate).add(1, 'minute') : dayjs()}
                        maxDateTime={
                          formData.dueDate && index === phases.length - 1
                            ? (() => {
                                let dueDate = dayjs(formData.dueDate);
                                // If due date is at midnight, treat as end of previous day
                                const isDueDateAtMidnight = dueDate.hour() === 0 && dueDate.minute() === 0 && dueDate.second() === 0;
                                if (isDueDateAtMidnight) {
                                  dueDate = dueDate.subtract(1, 'second').endOf('day');
                                }
                                // Last phase must end so buffer can complete before due date
                                return dueDate.subtract(formData.evaluationPhaseDays + formData.breathePhaseDays, 'day').endOf('day');
                              })()
                            : formData.dueDate
                            ? dayjs(formData.dueDate).endOf('day')
                            : undefined
                        }
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: 'small',
                            style: { width: '100%' }
                          }
                        }}
                      />
                    </LocalizationProvider>
                    {index > 0 && !phases[index - 1]?.endDate && (
                      <small className="help-text">
                        Complete the previous phase's end date first
                      </small>
                    )}
                    {(index === phases.length - 1) && (formData.breathePhaseDays > 0 || formData.evaluationPhaseDays > 0) && formData.dueDate && (
                      <small className="help-text" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                          <Clock size={16} style={{ marginTop: '2px', flexShrink: 0, color: '#34656D' }} />
                          <div>
                            <strong>Latest this phase can end:</strong>
                            <div style={{ fontSize: '13px', color: '#a5a5a5ff', marginTop: '4px' }}>
                              {(() => {
                                let dueDate = dayjs(formData.dueDate);
                                const isDueDateAtMidnight = dueDate.hour() === 0 && dueDate.minute() === 0 && dueDate.second() === 0;
                                if (isDueDateAtMidnight) {
                                  dueDate = dueDate.subtract(1, 'second').endOf('day');
                                }
                                const maxDate = dueDate.subtract(formData.evaluationPhaseDays + formData.breathePhaseDays, 'day').endOf('day');
                                return `${maxDate.format('MMM DD, YYYY')} at ${maxDate.format('h:mm A')}`;
                              })()}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: '#abababff', paddingLeft: '24px' }}>
                          <Info size={14} style={{ marginTop: '1px', flexShrink: 0 }} />
                          <div>
                            Must reserve {formData.evaluationPhaseDays + formData.breathePhaseDays} day{formData.evaluationPhaseDays + formData.breathePhaseDays > 1 ? 's' : ''} after this final phase for peer feedback and student rest before the project deadline
                          </div>
                        </div>
                      </small>
                    )}
                  </div>
                </div>

                  <div className="form-group">
                    <label>Description <span style={{color: 'red'}}>*</span></label>
                    <textarea
                      value={phase.description}
                      onChange={(e) => updatePhase(index, 'description', e.target.value)}
                      placeholder="Describe what needs to be completed in this phase"
                      rows={3}
                    />
              </div>

                  {/* Phase File Types */}
                  <div className="form-group">
                    <label>Allowed File Types</label>
                    <div className="file-types-container">
                      <div className="file-types-layout">
                        <div className="categories-panel">
                          <div className="categories-list">
                            {Object.entries(fileTypeCategories).map(([category, types]) => {
                              const selectedCount = Array.isArray(phase.file_types_allowed) ? 
                                types.filter(type => phase.file_types_allowed.includes(type)).length : 0;
                              const key = `${index}-${category}`;
                              const isOpen = selectedPhaseCategory[key];
                              return (
                                <div 
                                  key={category} 
                                  className={`category-item ${selectedCount > 0 ? 'has-selection' : ''} ${isOpen ? 'active' : ''}`}
                                  onClick={() => setSelectedPhaseCategory(prev => {
                                    // Close all other categories for this phase, toggle this one
                                    const newState = {};
                                    Object.keys(fileTypeCategories).forEach(cat => {
                                      newState[`${index}-${cat}`] = cat === category ? !isOpen : false;
                                    });
                                    return { ...prev, ...newState };
                                  })}
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
                          {Object.keys(fileTypeCategories).some(cat => selectedPhaseCategory[`${index}-${cat}`]) && (
                            <div>
                              <div className="panel-header">
                                <h5>{Object.keys(fileTypeCategories).find(cat => selectedPhaseCategory[`${index}-${cat}`])} File Types</h5>
                              </div>
                              <div className="file-types-list">
                                {Object.entries(fileTypeCategories).map(([category, types]) => {
                                  if (!selectedPhaseCategory[`${index}-${category}`]) return null;
                                  return types.map(type => {
                                    const isSelected = Array.isArray(phase.file_types_allowed) && 
                                                     phase.file_types_allowed.includes(type);
                                    return (
                                      <label key={type} className={`file-type-option ${isSelected ? 'selected' : ''}`}>
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => handlePhaseFileTypesChange(index, type)}
                                        />
                                        <span className="file-type-label">{type.toUpperCase()}</span>
                                      </label>
                                    );
                                  });
                                })}
                              </div>
                            </div>
                          )}
                          {!Object.keys(fileTypeCategories).some(cat => selectedPhaseCategory[`${index}-${cat}`]) && (
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
                            <span className="selected-count">
                              {phase.file_types_allowed.length} file types ({phase.file_types_allowed.join(', ')})
                            </span>
                          ) : (
                            <span className="no-selection">No Restriction - Any File Accepted</span>
                          )}
                        </div>
                        {Array.isArray(phase.file_types_allowed) && phase.file_types_allowed.length > 0 && (
                          <button 
                            type="button"
                            className="clear-all-btn"
                            onClick={() => updatePhase(index, 'file_types_allowed', [])}
                            title="Clear all selected file types"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Max Attempts</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="1"
                        value={phase.max_attempts}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 1;
                          if (value >= 1) {
                            updatePhase(index, 'max_attempts', value);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Phase Rubric and Evaluation */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Phase Rubric <span style={{color: 'red'}}>*</span></label>
                      <select
                        value={phase.rubricType || ''}
                        onChange={(e) => updatePhase(index, 'rubricType', e.target.value)}
                      >
                        <option value="">-- Select Rubric Type --</option>
                        <option value="builtin">Built-in Rubric</option>
                        <option value="upload">Upload Rubric File</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Phase Evaluation <span style={{color: 'red'}}>*</span></label>
                      <select
                        value={phase.evaluation_form_type || ''}
                        onChange={(e) => updatePhase(index, 'evaluation_form_type', e.target.value)}
                      >
                        <option value="">-- Select Evaluation Type --</option>
                        <option value="builtin">Built-in Form</option>
                        <option value="custom">Custom Form</option>
                      </select>
                    </div>
                  </div>
                    
                  {/* Phase Rubric Upload */}
                  {phase.rubricType === 'upload' && (
                    <div className="form-group">
                      <label>Rubric File</label>
                      <div className="modern-file-upload">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => handlePhaseFileUpload(index, 'rubricFile', e.target.files[0])}
                          className="file-input"
                          id={`phaseRubricFile-${index}`}
                        />
                        <label htmlFor={`phaseRubricFile-${index}`} className="file-upload-label">
                          {phase.rubricFile ? (
                            <div className="file-selected">
                              <FileText size={20} />
                              <div className="file-details">
                                <span className="file-name">{phase.rubricFile.name}</span>
                                <span className="file-size">{(phase.rubricFile.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                              <button 
                                type="button" 
                                className="remove-file-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePhaseFileUpload(index, 'rubricFile', null);
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="file-placeholder">
                              <Upload size={24} />
                              <span>Click to upload rubric file</span>
                              <small>PDF, DOC, DOCX, TXT files accepted</small>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Phase Evaluation Upload */}
                  {phase.evaluation_form_type === 'custom' && (
                    <div className="form-group">
                      <label>Evaluation Form File</label>
                      <div className="modern-file-upload">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={(e) => handlePhaseFileUpload(index, 'evaluation_form', e.target.files[0])}
                          className="file-input"
                          id={`phaseEvaluationForm-${index}`}
                        />
                        <label htmlFor={`phaseEvaluationForm-${index}`} className="file-upload-label">
                          {phase.evaluation_form ? (
                            <div className="file-selected">
                              <FileText size={20} />
                              <div className="file-details">
                                <span className="file-name">{phase.evaluation_form.name}</span>
                                <span className="file-size">{(phase.evaluation_form.size / 1024 / 1024).toFixed(2)} MB</span>
                              </div>
                              <button 
                                type="button" 
                                className="remove-file-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePhaseFileUpload(index, 'evaluation_form', null);
                                }}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="file-placeholder">
                              <Upload size={24} />
                              <span>Click to upload evaluation form</span>
                              <small>PDF, DOC, DOCX, TXT files accepted</small>
                            </div>
                          )}
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Phase Rubric and Evaluation Builders */}
                  <div className={`builders-container ${(phase.rubricType === 'builtin' && phase.evaluation_form_type === 'builtin') ? '' : 'single-builder'}`}>
                    {/* Phase Rubric Builder */}
                    {phase.rubricType === 'builtin' && (
                      <div className="builder-section">
                        <div className="builder-header">
                          <h5>Phase Rubric Builder</h5>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => addPhaseRubricCriterion(index)}
                              title="Add Criterion"
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => clearPhaseRubricCriteria(index)}
                              disabled={phase.rubric?.criteria.length === 0}
                              title="Clear All"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => restorePhaseRubricDefaults(index)}
                              title="Restore Defaults"
                            >
                              <RotateCcw size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Rubric Instructions</label>
                          <textarea
                            value={phase.rubric?.instructions || ''}
                            onChange={(e) => updatePhase(index, 'rubric', {...phase.rubric, instructions: e.target.value})}
                            placeholder="This phase will be evaluated using the criteria below. Each criterion has a maximum score, and your total grade is the sum of all criteria scores."
                            rows={3}
                            className="modern-textarea"
                          />
                        </div>

                        <div className="rubric-total">
                          <strong>Total Points: {phase.rubric?.totalPoints || 0}</strong>
                          {phase.rubric?.criteria && phase.rubric.criteria.length < 2 && (
                            <div className="validation-warning">
                              <AlertCircle size={16} />
                              <span>At least 2 criteria are required for the rubric</span>
                            </div>
                          )}
                        </div>

                        <div className="rubric-criteria-grid">
                          {(phase.rubric?.criteria || []).map((criterion, criterionIndex) => (
                            <div key={criterionIndex} className="modern-rubric-card">
                              <div className="rubric-header">
                                <div className="criterion-name-group">
                                  <input
                                    type="text"
                                    value={criterion.name}
                                    onChange={(e) => updatePhaseRubricCriterion(index, criterionIndex, 'name', e.target.value)}
                                    className="modern-input criterion-name"
                                    placeholder="Criterion name"
                                  />
                                  <div className="rubric-points">
                                    <input
                                      type="number"
                                      min="0"
                                      value={criterion.maxPoints}
                                      onChange={(e) => updatePhaseRubricCriterion(index, criterionIndex, 'maxPoints', parseFloat(e.target.value) || 0)}
                                      className="modern-input points-input"
                                    />
                                    <span>pts</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-icon danger"
                                  onClick={() => removePhaseRubricCriterion(index, criterionIndex)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <textarea
                                value={criterion.description}
                                onChange={(e) => updatePhaseRubricCriterion(index, criterionIndex, 'description', e.target.value)}
                                placeholder="Describe this criterion"
                                rows={2}
                                className="modern-textarea"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Phase Evaluation Builder */}
                    {phase.evaluation_form_type === 'builtin' && (
                      <div className="builder-section">
                        <div className="builder-header">
                          <h5>Phase Evaluation Builder</h5>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => addPhaseEvaluationCriterion(index)}
                              title="Add Criterion"
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => clearPhaseEvaluationCriteria(index)}
                              disabled={phase.builtInEvaluation?.criteria.length === 0}
                              title="Clear All"
                            >
                              <Trash2 size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline btn-sm"
                              onClick={() => restorePhaseEvaluationDefaults(index)}
                              title="Restore Defaults"
                            >
                              <RotateCcw size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="form-group">
                          <label>Evaluation Instructions</label>
                          <textarea
                            value={phase.builtInEvaluation?.instructions || ''}
                            onChange={(e) => updatePhase(index, 'builtInEvaluation', {...phase.builtInEvaluation, instructions: e.target.value})}
                            placeholder="Please evaluate your groupmates using the criteria below. Be fair and constructive in your feedback."
                            rows={3}
                            className="modern-textarea"
                          />
                        </div>

                        <div className="evaluation-total">
                          <strong>Total Points: {phase.builtInEvaluation?.totalPoints || 0}</strong>
                          {phase.builtInEvaluation?.criteria && phase.builtInEvaluation.criteria.length < 2 && (
                            <div className="validation-warning">
                              <AlertCircle size={16} />
                              <span>At least 2 criteria are required for the evaluation form</span>
                            </div>
                          )}
                        </div>

                        <div className="evaluation-criteria-grid">
                          {(phase.builtInEvaluation?.criteria || []).map((criterion, criterionIndex) => (
                            <div key={criterionIndex} className="modern-evaluation-card">
                              <div className="evaluation-header">
                                <div className="criterion-name-group">
                                  <input
                                    type="text"
                                    value={criterion.name}
                                    onChange={(e) => updatePhaseEvaluationCriterion(index, criterionIndex, 'name', e.target.value)}
                                    className="modern-input criterion-name"
                                    placeholder="Criterion name"
                                  />
                                  <div className="evaluation-points">
                                    <input
                                      type="number"
                                      min="0"
                                      value={criterion.maxPoints}
                                      onChange={(e) => updatePhaseEvaluationCriterion(index, criterionIndex, 'maxPoints', parseFloat(e.target.value) || 0)}
                                      className="modern-input points-input"
                                    />
                                    <span>pts</span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  className="btn-icon danger"
                                  onClick={() => removePhaseEvaluationCriterion(index, criterionIndex)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>

                              <textarea
                                value={criterion.description}
                                onChange={(e) => updatePhaseEvaluationCriterion(index, criterionIndex, 'description', e.target.value)}
                                placeholder="Describe this evaluation criterion"
                                rows={2}
                                className="modern-textarea"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Evaluation and Breathe Phase Display */}
                {phase.endDate && (
                  <div className="timeline-buffers-row">
                    {formData.evaluationPhaseDays > 0 && (
                      (() => {
                        const evalStartDate = calculateEvaluationStartDate(phase.endDate);
                        const evalEndDate = calculateEvaluationDueDate(evalStartDate, formData.evaluationPhaseDays);
                        return (
                          <div className="buffer-card">
                            <h4>Evaluation Phase</h4>
                            {evalStartDate && evalEndDate && (
                              <div className="buffer-dates">
                                <div className="date-item" style={{ background: 'transparent', border: 'none', padding: '0', flexDirection: 'column', alignItems: 'flex-start' }}>
                                  <label>Starts:</label>
                                  <span>{dayjs(evalStartDate).format('MMM DD, YYYY h:mm A')}</span>
                                </div>
                                <div className="date-item" style={{ background: 'transparent', border: 'none', padding: '0', flexDirection: 'column', alignItems: 'flex-start' }}>
                                  <label>Ends:</label>
                                  <span>{dayjs(evalEndDate).format('MMM DD, YYYY h:mm A')}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                    
                    {formData.breathePhaseDays > 0 && (
                      (() => {
                        const evalStartDate = calculateEvaluationStartDate(phase.endDate);
                        const evalEndDate = calculateEvaluationDueDate(evalStartDate, formData.evaluationPhaseDays);
                        // Breathe starts 1 minute after evaluation ends
                        const breatheStartDate = dayjs(evalEndDate).add(1, 'minute');
                        
                        // For the last phase, breathe extends to project due date
                        // For other phases, breathe is just the configured duration
                        const isLastPhase = index === phases.length - 1;
                        let breatheEndDate;
                        
                        if (isLastPhase && formData.dueDate) {
                          // Last phase: breathe extends to 1 minute before project deadline
                          const projectDue = dayjs(formData.dueDate);
                          breatheEndDate = projectDue.subtract(1, 'minute');
                        } else {
                          // Not last phase: breathe is just the configured duration
                          // Add full 24-hour periods and subtract 1 minute
                          breatheEndDate = breatheStartDate.add(formData.breathePhaseDays * 24, 'hour').subtract(1, 'minute');
                        }
                        
                        return (
                          <div className="buffer-card">
                            <h4>Rest Period (Breathe)</h4>
                            {breatheStartDate && breatheEndDate && (
                              <div className="buffer-dates">
                                <div className="date-item" style={{ background: 'transparent', border: 'none', padding: '0', flexDirection: 'column', alignItems: 'flex-start' }}>
                                  <label>Starts:</label>
                                  <span>{breatheStartDate.format('MMM DD, YYYY h:mm A')}</span>
                                </div>
                                <div className="date-item" style={{ background: 'transparent', border: 'none', padding: '0', flexDirection: 'column', alignItems: 'flex-start' }}>
                                  <label>Ends:</label>
                                  <span>{breatheEndDate.format('MMM DD, YYYY h:mm A')}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </React.Fragment>
              ))}
              {/* Add Phase Button */}
              <div className="add-phase-container">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={addPhase}
                  disabled={!canAddNewPhase()}
                  title={!canAddNewPhase() ? "Please complete all fields in the current phase before adding a new one" : "Add a new phase"}
                >
                  <Plus size={16} />
                  Add Phase
                </button>
              </div>
            </div>
          </div>
        );


      default:
        return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.title) {
      setError('Project title is required');
      setLoading(false);
      return;
    }

    if (!formData.dueDate) {
      setError('Due date is required');
      setLoading(false);
      return;
    }

    if (!formData.projectRubricType) {
      setError('Please select a project rubric type');
      setLoading(false);
      return;
    }

    if (!formData.projectEvaluationType) {
      setError('Please select a project evaluation type');
      setLoading(false);
      return;
    }

    // Validate phases
    if (phases.length === 0) {
      setError('At least one phase is required');
      setLoading(false);
      return;
    }

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      if (!phase.name || !phase.description || !phase.startDate || !phase.endDate) {
        setError(`Phase ${i + 1}: Please fill in all required fields (name, description, start date, end date)`);
        setLoading(false);
        return;
      }

      if (!phase.rubricType) {
        setError(`Phase ${i + 1}: Please select a rubric type`);
        setLoading(false);
        return;
      }

      if (!phase.evaluation_form_type) {
        setError(`Phase ${i + 1}: Please select an evaluation type`);
        setLoading(false);
        return;
      }

      // Validate rubric file if upload type is selected
      if (phase.rubricType === 'upload' && !phase.rubricFile) {
        setError(`Phase ${i + 1}: Please upload a rubric file`);
        setLoading(false);
        return;
      }

      // Validate evaluation form if custom type is selected
      if (phase.evaluation_form_type === 'custom' && !phase.evaluation_form) {
        setError(`Phase ${i + 1}: Please upload an evaluation form`);
        setLoading(false);
        return;
      }
    }

    try {
      if (!courseId) {
        throw new Error('Course ID not found. Please refresh the page and try again.');
      }

      // Convert files to base64 for transmission with error handling
      const convertFileToBase64 = (file, fileType) => {
        return new Promise((resolve, reject) => {
          // Validate file exists
          if (!file) {
            reject(new Error(`${fileType} file is required but not provided`));
            return;
          }

          // Validate file size (max 10MB)
          const maxSize = 10 * 1024 * 1024; // 10MB
          if (file.size > maxSize) {
            reject(new Error(`${fileType} file is too large. Maximum size is 10MB, but file is ${(file.size / 1024 / 1024).toFixed(2)}MB`));
            return;
          }

          // Validate file type
          const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
          if (!validTypes.includes(file.type)) {
            reject(new Error(`${fileType} must be a PDF, DOC, DOCX, or TXT file. Received: ${file.type}`));
            return;
          }

          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            if (!reader.result) {
              reject(new Error(`Failed to read ${fileType} file`));
              return;
            }
            console.log(`✅ Successfully converted ${fileType} to base64`);
            resolve(reader.result);
          };
          reader.onerror = (error) => {
            console.error(`❌ Error reading ${fileType}:`, error);
            reject(new Error(`Failed to read ${fileType} file: ${error.message || 'Unknown error'}`));
          };
        });
      };

      // Convert custom files if they exist with error handling
      let projectRubricFileData = null;
      let projectEvaluationFormData = null;

      try {
        if (formData.projectRubricType === 'upload' && formData.projectRubricFile) {
          console.log('📤 Converting project rubric file...');
          projectRubricFileData = await convertFileToBase64(formData.projectRubricFile, 'Project Rubric');
        }

        if (formData.projectEvaluationType === 'custom' && formData.projectEvaluationForm) {
          console.log('📤 Converting project evaluation form...');
          projectEvaluationFormData = await convertFileToBase64(formData.projectEvaluationForm, 'Project Evaluation Form');
        }
      } catch (fileError) {
        throw new Error(`File conversion failed: ${fileError.message}`);
      }

      // Calculate evaluation dates for each phase FIRST
      const phasesWithEvaluationDates = phases.map((phase, index) => {
        console.log(`📌 Phase ${index + 1} BEFORE evaluation calc:`, {
          name: phase.name,
          startDate: phase.startDate,
          endDate: phase.endDate
        });
        
        const evaluationStartDate = calculateEvaluationStartDate(phase.endDate);
        const evaluationDueDate = calculateEvaluationDueDate(
          evaluationStartDate,
          formData.evaluationPhaseDays
        );
        
        // For last phase, breathe extends to project due date (1 minute before)
        const isLastPhase = index === phases.length - 1;
        let breathePhaseEnd;
        
        if (isLastPhase && formData.dueDate) {
          // Last phase: breathe extends to 1 minute before project deadline
          const projectDue = dayjs(formData.dueDate);
          breathePhaseEnd = projectDue.subtract(1, 'minute').format('YYYY-MM-DDTHH:mm:ss.SSS');
        } else {
          // Not last phase: calculate breathe end normally
          breathePhaseEnd = calculateBreathePhaseEnd(
            evaluationDueDate,
            formData.breathePhaseDays
          );
        }
        
        const result = {
          ...phase,
          evaluation_available_from: evaluationStartDate,
          evaluation_due_date: evaluationDueDate,
          breathe_phase_end: breathePhaseEnd
        };
        
        console.log(`📌 Phase ${index + 1} AFTER evaluation calc:`, {
          name: result.name,
          startDate: result.startDate,
          endDate: result.endDate,
          evaluation_available_from: result.evaluation_available_from,
          evaluation_due_date: result.evaluation_due_date,
          breathe_phase_end: result.breathe_phase_end
        });
        
        return result;
      });

      // Calculate project evaluation dates (same as last phase evaluation period)
      const lastPhase = phasesWithEvaluationDates[phasesWithEvaluationDates.length - 1];
      // Project evaluation runs during the last phase's evaluation period
      const projectEvaluationStartDate = lastPhase.evaluation_available_from;
      const projectEvaluationDeadline = lastPhase.evaluation_due_date;

      console.log('📅 Project evaluation dates calculated from last phase:', {
        projectEvaluationStartDate,
        projectEvaluationDeadline,
        lastPhaseNumber: phasesWithEvaluationDates.length
      });

      // Convert phase files with error handling
      let convertedPhases;
      try {
        convertedPhases = await Promise.all(phasesWithEvaluationDates.map(async (phase, index) => {
          console.log(`🔄 Phase ${phase.name} BEFORE file conversion:`, {
            startDate: phase.startDate,
            endDate: phase.endDate
          });
          
          const phaseData = { ...phase };
          
          try {
            if (phase.rubricType === 'upload' && phase.rubricFile) {
              console.log(`📤 Converting rubric for phase ${index + 1}...`);
              phaseData.rubricFileData = await convertFileToBase64(phase.rubricFile, `Phase ${index + 1} Rubric`);
            }
            
            if (phase.evaluation_form_type === 'custom' && phase.evaluation_form) {
              console.log(`📤 Converting evaluation form for phase ${index + 1}...`);
              phaseData.evaluationFormData = await convertFileToBase64(phase.evaluation_form, `Phase ${index + 1} Evaluation Form`);
            }
          } catch (phaseFileError) {
            throw new Error(`Phase ${index + 1} (${phase.name}): ${phaseFileError.message}`);
          }
          
          console.log(`🔄 Phase ${phaseData.name} AFTER file conversion:`, {
            startDate: phaseData.startDate,
            endDate: phaseData.endDate
          });
          
          return phaseData;
        }));
      } catch (phaseError) {
        throw new Error(`Phase file conversion failed: ${phaseError.message}`);
      }

      // NOW build projectData with the calculated evaluation dates included
      const projectData = {
        ...formData,
        courseId: courseId,
        projectRubricFile: projectRubricFileData,
        projectEvaluationForm: projectEvaluationFormData,
        project_evaluation_available_from: projectEvaluationStartDate,
        projectEvaluationDeadline: projectEvaluationDeadline,
        phases: convertedPhases.map(phase => {
          const phaseData = {
            ...phase,
            // Strip timezone from phase dates so backend treats as local time
            startDate: phase.startDate ? phase.startDate.replace(/Z$/, '') : phase.startDate,
            endDate: phase.endDate ? phase.endDate.replace(/Z$/, '') : phase.endDate,
            file_types_allowed: phase.file_types_allowed || []
          };
          
          // Explicitly include built-in evaluation criteria if evaluation_form_type is 'builtin'
          if (phase.evaluation_form_type === 'builtin' && phase.builtInEvaluation) {
            phaseData.builtInEvaluation = phase.builtInEvaluation;
            console.log(`✅ Phase "${phase.name}" - Including built-in evaluation with ${phase.builtInEvaluation.criteria?.length || 0} criteria`);
          }
          
          // Explicitly include built-in rubric if rubricType is 'builtin'
          if (phase.rubricType === 'builtin' && phase.rubric) {
            phaseData.rubric = phase.rubric;
            console.log(`✅ Phase "${phase.name}" - Including built-in rubric with ${phase.rubric.criteria?.length || 0} criteria`);
          }
          
          return phaseData;
        }),
        builtInEvaluation: formData.projectEvaluationType === 'builtin' ? builtInEvaluation : null,
        projectRubric: formData.projectRubricType === 'builtin' ? projectRubric : null
      };

      console.log('🚀 Creating project with data:', {
        projectRubricType: formData.projectRubricType,
        projectEvaluationType: formData.projectEvaluationType,
        projectRubric: projectData.projectRubric,
        builtInEvaluation: projectData.builtInEvaluation,
        hasRubricFile: !!projectRubricFileData,
        hasEvaluationForm: !!projectEvaluationFormData,
        fileTypesAllowed: formData.fileTypesAllowed
      });
      
      // DEBUG: Log the actual phases being sent with evaluation data
      console.log('📋 PHASES BEING SENT TO BACKEND:', JSON.stringify(projectData.phases.map(p => ({
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        evaluation_form_type: p.evaluation_form_type,
        hasBuiltInEvaluation: !!p.builtInEvaluation,
        builtInEvaluationCriteriaCount: p.builtInEvaluation?.criteria?.length || 0,
        rubricType: p.rubricType,
        hasRubric: !!p.rubric,
        rubricCriteriaCount: p.rubric?.criteria?.length || 0
      })), null, 2));
      
      // DEBUG: Log full phase evaluation data for built-in evaluations
      projectData.phases.forEach((phase, index) => {
        if (phase.evaluation_form_type === 'builtin' && phase.builtInEvaluation) {
          console.log(`📊 Phase ${index + 1} (${phase.name}) - Built-in Evaluation Details:`, {
            criteriaCount: phase.builtInEvaluation.criteria?.length || 0,
            totalPoints: phase.builtInEvaluation.totalPoints,
            instructions: phase.builtInEvaluation.instructions,
            criteria: phase.builtInEvaluation.criteria?.map(c => ({
              name: c.name,
              maxPoints: c.maxPoints,
              description: c.description
            }))
          });
        }
      });
      
      // DEBUG: Log the phases from state DIRECTLY before any transformation
      console.log('🔬 PHASES IN STATE RIGHT NOW:', JSON.stringify(phases.map(p => ({
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate
      })), null, 2));
      
      // Send to backend with comprehensive error handling
      let response;
      try {
        console.log('📡 Sending project data to backend...');
        response = await fetch(`/api/professor/course/${courseId}/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(projectData)
        });
      } catch (networkError) {
        throw new Error(`Network error: Unable to reach server. Please check your internet connection and try again. (${networkError.message})`);
      }

      // Handle response errors
      if (!response.ok) {
        let errorMessage = 'Failed to create project';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          console.error('❌ Backend error:', errorData);
        } catch (jsonError) {
          // If response is not JSON, use status text
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Success! Parse response
      let responseData;
      try {
        responseData = await response.json();
        console.log('✅ Project created successfully:', responseData);
      } catch (jsonError) {
        console.warn('Warning: Could not parse success response, but project was created');
      }

      // Close modal and refresh
      resetModal();
      onProjectCreated();
      onClose();
      
    } catch (error) {
      console.error('❌ Project creation error:', error);
      
      // Set user-friendly error message
      let userMessage = error.message;
      
      // Add helpful context for common errors
      if (error.message.includes('Network error')) {
        userMessage = error.message; // Already has good context
      } else if (error.message.includes('Failed to upload')) {
        userMessage += '\n\nPlease check that your files are valid and try again.';
      } else if (error.message.includes('File conversion failed')) {
        userMessage += '\n\nPlease ensure all uploaded files are valid PDF, DOC, DOCX, or TXT files.';
      } else if (error.message.includes('too large')) {
        userMessage += '\n\nPlease reduce the file size or use a different file.';
      } else if (!error.message) {
        userMessage = 'An unexpected error occurred. Please try again.';
      }
      
      setError(userMessage);
      
      // Don't close the modal so user can fix the error
      // Keep loading state off so user can try again
      setLoading(false);
      
      // Scroll to top to show error message
      const modalContent = document.querySelector('.content-area');
      if (modalContent) {
        modalContent.scrollTop = 0;
      }
    } finally {
      setLoading(false);
    }
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
        maxWidth: '1400px',
        maxHeight: '90vh',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h3 style={{
              margin: 0,
              color: 'rgb(135, 35, 65)',
              fontWeight: '700',
              fontSize: '1.25rem'
            }}>Create New Project</h3>
            
            {/* Preset Mode Button - Only show if course has presets */}
            {hasPresets && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => isProjectSetupComplete() && setShowPresetMode(true)}
                  disabled={!isProjectSetupComplete()}
                  style={{
                    background: isProjectSetupComplete() 
                      ? 'linear-gradient(135deg, rgb(135, 35, 65), rgb(100, 25, 50))'
                      : 'linear-gradient(135deg, rgb(150, 150, 150), rgb(120, 120, 120))',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: isProjectSetupComplete() ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    boxShadow: isProjectSetupComplete() 
                      ? '0 2px 4px rgba(135, 35, 65, 0.3)'
                      : '0 2px 4px rgba(0, 0, 0, 0.2)',
                    opacity: isProjectSetupComplete() ? 1 : 0.6
                  }}
                  onMouseEnter={(e) => {
                    if (isProjectSetupComplete()) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(135, 35, 65, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isProjectSetupComplete()) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 4px rgba(135, 35, 65, 0.3)';
                    }
                  }}
                  title={!isProjectSetupComplete() ? 'Complete Project Setup first' : 'Use preset templates'}
                >
                  {isProjectSetupComplete() ? (
                    <CheckCircle size={16} />
                  ) : (
                    <AlertCircle size={16} />
                  )}
                  Preset Mode
                </button>
                {!isProjectSetupComplete() && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: '0.5rem',
                    background: 'rgb(255, 152, 0)',
                    color: 'white',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 8px rgba(255, 152, 0, 0.3)',
                    zIndex: 10
                  }}>
                    Complete Setup First
                  </div>
                )}
              </div>
            )}
          </div>
          <button 
            onClick={() => {
              resetModal();
              onClose();
            }}
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
          display: 'flex',
          flex: 1,
          overflow: 'hidden'
        }}>
          {/* Left Sidebar - Steps */}
          <div style={{
            width: '320px',
            background: 'rgb(9, 18, 44)',
            borderRight: '2px solid rgba(255, 255, 255, 0.1)',
            padding: '20px',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    cursor: step.id === 'phases' && !checkStepCompletion('project-setup') ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    border: currentStep === step.id ? '2px solid rgb(135, 35, 65)' : '2px solid transparent',
                    background: currentStep === step.id ? 'rgba(135, 35, 65, 0.3)' : (completedSteps.has(step.id) ? 'rgba(16, 185, 129, 0.15)' : 'transparent'),
                    opacity: step.id === 'phases' && !checkStepCompletion('project-setup') ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!(step.id === 'phases' && !checkStepCompletion('project-setup'))) {
                      e.currentTarget.style.background = 'rgba(135, 35, 65, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = currentStep === step.id ? 'rgba(135, 35, 65, 0.3)' : (completedSteps.has(step.id) ? 'rgba(16, 185, 129, 0.15)' : 'transparent');
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: currentStep === step.id ? 'rgb(135, 35, 65)' : (completedSteps.has(step.id) ? 'rgb(16, 185, 129)' : 'rgba(255, 255, 255, 0.1)'),
                    color: currentStep === step.id || completedSteps.has(step.id) ? 'white' : 'rgba(255, 255, 255, 0.7)',
                    fontWeight: '600',
                    fontSize: '14px',
                    flexShrink: 0
                  }}>
                    {completedSteps.has(step.id) ? (
                      <CheckCircle size={20} />
                    ) : (
                      <span>{index + 1}</span>
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '2px'
                    }}>{step.title}</div>
                    <div style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.7)'
                    }}>
                      {completedSteps.has(step.id) ? 'Completed' : 'Pending'}
                    </div>
                    {step.subsections && (
                      <div style={{
                        marginTop: '8px',
                        paddingLeft: '8px'
                      }}>
                        {step.subsections.map(subsection => (
                          <div 
                            key={subsection.id} 
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '4px 0',
                              fontSize: '12px',
                              transition: 'all 0.2s ease',
                              color: subsection.completed() ? 'rgb(135, 35, 65)' : 'rgba(255, 255, 255, 0.9)'
                            }}
                          >
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '16px',
                              height: '16px'
                            }}>
                              {subsection.completed() ? (
                                <CheckCircle size={14} />
                              ) : (
                                <div style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  background: 'rgba(255, 255, 255, 0.3)'
                                }} />
                              )}
                            </div>
                            <span style={{ fontWeight: '500', color: subsection.completed() ? 'rgb(135, 35, 65)' : 'rgba(255, 255, 255, 0.9)' }}>{subsection.title}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Content Area */}
          <div style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            background: 'rgb(9, 18, 44)'
          }}>
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 16px',
                background: 'rgba(254, 242, 242, 0.95)',
                border: '1px solid rgb(254, 202, 202)',
                borderRadius: '6px',
                color: 'rgb(220, 38, 38)',
                marginBottom: '16px'
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {renderStepContent()}
          </div>
        </div>

        {/* Modal Footer - Always Visible */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
          padding: '16px 20px',
          borderTop: '2px solid rgb(135, 35, 65)',
          background: 'rgb(9, 18, 44)'
        }}>
          <button
            type="button"
            onClick={() => {
              resetModal();
              onClose();
            }}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              background: 'transparent',
              color: 'white',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !isAllStepsCompleted()}
            style={{
              padding: '10px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (loading || !isAllStepsCompleted()) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              border: 'none',
              background: (loading || !isAllStepsCompleted()) ? 'rgba(135, 35, 65, 0.6)' : 'rgb(135, 35, 65)',
              color: 'white',
              opacity: (loading || !isAllStepsCompleted()) ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading && isAllStepsCompleted()) {
                e.currentTarget.style.background = 'rgb(110, 25, 50)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && isAllStepsCompleted()) {
                e.currentTarget.style.background = 'rgb(135, 35, 65)';
              }
            }}
          >
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>

      {/* Auto-Set Dates Modal */}
      {showAutoSetModal && (
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
          zIndex: 100000
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '32px',
            width: '90%',
            maxWidth: '500px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ marginBottom: '24px', color: 'rgb(44, 42, 34)', fontWeight: '700', fontSize: '1.25rem' }}>Auto-Set Phase Dates</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ marginBottom: 0 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  color: 'rgb(55, 65, 81)',
                  fontSize: '14px'
                }}>Number of Phases</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={autoSetConfig.numberOfPhases}
                  onChange={(e) => setAutoSetConfig({ ...autoSetConfig, numberOfPhases: parseInt(e.target.value) || 1 })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid rgb(235, 229, 194)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgb(185, 178, 138)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(185, 178, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgb(235, 229, 194)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <small style={{
                  fontSize: '12px',
                  color: 'rgb(100, 116, 139)',
                  marginTop: '4px',
                  display: 'block'
                }}>How many phases do you want to create?</small>
              </div>

              <div style={{ marginBottom: 0 }}>
                <label style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '500',
                  color: 'rgb(55, 65, 81)',
                  fontSize: '14px'
                }}>Phase Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={autoSetConfig.phaseDurationDays}
                  onChange={(e) => setAutoSetConfig({ ...autoSetConfig, phaseDurationDays: parseInt(e.target.value) || 7 })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid rgb(235, 229, 194)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    transition: 'border-color 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgb(185, 178, 138)';
                    e.target.style.boxShadow = '0 0 0 3px rgba(185, 178, 138, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgb(235, 229, 194)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <small style={{
                  fontSize: '12px',
                  color: 'rgb(100, 116, 139)',
                  marginTop: '4px',
                  display: 'block'
                }}>Duration for each phase (ignored if auto-space is enabled)</small>
              </div>

              <div style={{ marginBottom: 0 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500', color: 'rgb(55, 65, 81)', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={autoSetConfig.autoSpacePhases}
                    onChange={(e) => setAutoSetConfig({ ...autoSetConfig, autoSpacePhases: e.target.checked })}
                    style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
                  />
                  <span>Auto-Space Phases (divide timeline equally)</span>
                </label>
                <small style={{
                  fontSize: '12px',
                  color: 'rgb(100, 116, 139)',
                  marginTop: '4px',
                  display: 'block',
                  paddingLeft: '28px'
                }}>
                  {autoSetConfig.autoSpacePhases
                    ? 'Phases will be evenly distributed across project timeline'
                    : 'Each phase will be exactly ' + autoSetConfig.phaseDurationDays + ' days'}
                </small>
              </div>

              {formData.startDate && formData.dueDate && (() => {
                const startDate = dayjs(formData.startDate);
                const dueDate = dayjs(formData.dueDate);
                
                const isDueDateAtMidnight = dueDate.hour() === 0 && dueDate.minute() === 0 && dueDate.second() === 0;
                const effectiveDueDate = isDueDateAtMidnight ? dueDate.subtract(1, 'second') : dueDate;
                const totalDays = effectiveDueDate.diff(startDate, 'day', true);
                
                const bufferDays = (formData.evaluationPhaseDays || 0) + (formData.breathePhaseDays || 0);
                const numPhases = autoSetConfig.numberOfPhases;
                
                let phaseDurationNeeded;
                let totalNeeded;
                let isValid;
                
                if (autoSetConfig.autoSpacePhases) {
                  totalNeeded = (numPhases * 1) + (numPhases * bufferDays);
                  isValid = totalNeeded <= totalDays;
                  phaseDurationNeeded = isValid ? Math.floor((totalDays - (numPhases * bufferDays)) / numPhases) : 0;
                } else {
                  totalNeeded = (autoSetConfig.phaseDurationDays * numPhases) + (numPhases * bufferDays);
                  isValid = totalNeeded <= totalDays;
                  phaseDurationNeeded = autoSetConfig.phaseDurationDays;
                }

                return (
                  <div style={{
                    background: isValid ? 'rgb(245, 243, 238)' : 'rgb(254, 226, 226)',
                    padding: '16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: isValid ? 'rgb(102, 102, 102)' : 'rgb(153, 27, 27)',
                    border: isValid ? '1px solid rgb(229, 222, 200)' : '1px solid rgb(252, 165, 165)'
                  }}>
                    <strong>{isValid ? 'Configuration Valid ✓' : 'Configuration Not Possible ✗'}</strong>
                    <div style={{ marginTop: '8px', lineHeight: '1.6' }}>
                      Timeline: {startDate.format('MMM DD')} to {dueDate.format('MMM DD')} ({Math.floor(totalDays)} days{isDueDateAtMidnight ? ' (due date at midnight)' : ''})
                      <br />
                      {isValid ? (
                        <>
                          Creating {numPhases} phases ({phaseDurationNeeded} days each) + {bufferDays} days after each
                          <br />
                          <span style={{ fontSize: '12px', opacity: 0.8 }}>Total needed: {totalNeeded} days ✓</span>
                        </>
                      ) : (
                        <>
                          Not enough days! Need {totalNeeded} days but only have {Math.floor(totalDays)} days.
                          <br />
                          <span style={{ fontSize: '12px', opacity: 0.8 }}>Try: fewer phases, shorter durations, reduce eval/breathe days, or extend project dates</span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowAutoSetModal(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  background: 'rgb(80, 75, 56)',
                  color: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgb(61, 56, 41)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgb(80, 75, 56)'}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={autoSetPhaseDates}
                disabled={!isAutoSetConfigValid()}
                title={!isAutoSetConfigValid() ? 'Configuration is not possible with current settings' : 'Apply auto-set dates'}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: !isAutoSetConfigValid() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  border: 'none',
                  background: !isAutoSetConfigValid() ? 'rgba(135, 35, 65, 0.6)' : 'rgb(135, 35, 65)',
                  color: 'white',
                  opacity: !isAutoSetConfigValid() ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (isAutoSetConfigValid()) e.currentTarget.style.background = 'rgb(110, 25, 50)';
                }}
                onMouseLeave={(e) => {
                  if (isAutoSetConfigValid()) e.currentTarget.style.background = 'rgb(135, 35, 65)';
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(9, 18, 44, 0.85) !important;
          backdrop-filter: blur(3.2px) saturate(120%) !important;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
        }

        .two-column-project-modal {
          background: rgb(9, 18, 44) !important;
          border-radius: 16px !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5) !important;
          border: 2px solid rgb(235, 229, 194) !important;
          width: 100%;
          max-width: 1400px;
          max-height: 90vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          padding: 17px 22px;
          border-bottom: 2px solid rgb(135, 35, 65) !important;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgb(9, 18, 44) !important;
        }

        .modal-header h3 {
          margin: 0;
          color: white !important;
          font-size: 1.4rem;
          font-weight: 700;
          font-family: Georgia, 'Times New Roman', Times, serif;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          color: rgba(255, 255, 255, 0.7) !important;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: rgba(135, 35, 65, 0.2) !important;
          color: white !important;
        }

        .modal-body {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .steps-sidebar {
          width: 320px;
          background: rgb(9, 18, 44) !important;
          border-right: 2px solid rgba(255, 255, 255, 0.1) !important;
          padding: 20px;
          overflow-y: auto;
        }

        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 2px solid transparent;
          color: white !important;
        }

        .step-item:hover {
          background: rgba(135, 35, 65, 0.2) !important;
        }

        .step-item.active {
          background: rgba(135, 35, 65, 0.3) !important;
          border-color: rgb(135, 35, 65) !important;
        }

        .step-item.completed {
          background: rgba(16, 185, 129, 0.15) !important;
          border-color: transparent;
        }

        .step-item.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          background: transparent;
        }

        .step-item.disabled:hover {
          background: transparent;
        }

        .step-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.7) !important;
          font-weight: 600;
          font-size: 14px;
        }

        .step-item.active .step-icon {
          background: rgb(135, 35, 65) !important;
          color: white !important;
        }

        .step-item.completed .step-icon {
          background: rgb(16, 185, 129) !important;
          color: white !important;
        }

        .step-content {
          flex: 1;
        }

        .step-title {
          font-weight: 600;
          color: white !important;
          margin-bottom: 2px;
        }

        .step-status {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .step-subsections {
          margin-top: 8px;
          padding-left: 8px;
        }

        .subsection-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 0;
          font-size: 12px;
          transition: all 0.2s ease;
        }

        .subsection-item.completed {
          color: rgb(135, 35, 65) !important;
        }

        .subsection-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 16px;
          height: 16px;
        }

        .subsection-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3) !important;
        }

        .subsection-item.completed .subsection-dot {
          display: none;
        }

        .subsection-title {
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9) !important;
        }

        .content-area {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          background: rgb(9, 18, 44) !important;
        }

        .step-content h3 {
          margin: 0 0 20px 0;
          color: white !important;
          font-size: 20px;
          font-weight: 700;
          font-family: Georgia, 'Times New Roman', Times, serif;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 600;
          color: white !important;
          font-size: 14px;
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.2s ease;
          background: rgba(255, 255, 255, 0.05) !important;
          color: white !important;
          -webkit-text-fill-color: white !important;
        }

        .form-group input::placeholder,
        .form-group textarea::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.5) !important;
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: rgb(135, 35, 65) !important;
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.15) !important;
        }

        /* Fix for select dropdown options */
        .form-group select option {
          background: rgb(9, 18, 44) !important;
          color: white !important;
          padding: 8px !important;
        }

        /* MUI DateTimePicker Fixes */
        .MuiInputBase-root {
          background: rgba(255, 255, 255, 0.05) !important;
          color: white !important;
          border-radius: 6px !important;
        }

        .MuiInputBase-input {
          color: white !important;
          -webkit-text-fill-color: white !important;
          padding: 10px 12px !important;
        }

        .MuiInputBase-input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.5) !important;
        }

        /* Force white text on specific MUI DateTimePicker classes */
        .MuiPickersInputBase-root,
        .MuiPickersOutlinedInput-root,
        .css-1hgcujo-MuiPickersInputBase-root-MuiPickersOutlinedInput-root,
        [class*="MuiPickersInputBase-root"],
        [class*="MuiPickersOutlinedInput-root"] {
          color: white !important;
        }

        .MuiPickersInputBase-input,
        .css-1hgcujo-MuiPickersInputBase-root-MuiPickersOutlinedInput-root input,
        [class*="MuiPickersInputBase-root"] input {
          color: white !important;
          -webkit-text-fill-color: white !important;
        }

        .MuiOutlinedInput-notchedOutline {
          border-color: rgba(255, 255, 255, 0.2) !important;
        }

        .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline {
          border-color: rgba(255, 255, 255, 0.4) !important;
        }

        .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline {
          border-color: rgb(135, 35, 65) !important;
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.15) !important;
        }

        .MuiIconButton-root {
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .MuiIconButton-root:hover {
          color: white !important;
          background: rgba(255, 255, 255, 0.1) !important;
        }

        /* DateTimePicker Popup/Popper */
        .MuiPaper-root {
          background: rgb(9, 18, 44) !important;
          color: white !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        .MuiPopper-root {
          z-index: 100000 !important;
        }

        .MuiPickersPopper-root {
          z-index: 100000 !important;
        }

        .MuiModal-root {
          z-index: 100000 !important;
        }

        .MuiPickersCalendarHeader-root {
          color: white !important;
        }

        .MuiPickersCalendarHeader-label {
          color: white !important;
        }

        .MuiDayCalendar-weekDayLabel {
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .MuiPickersDay-root {
          color: white !important;
          background: transparent !important;
        }

        .MuiPickersDay-root:hover {
          background: rgba(135, 35, 65, 0.2) !important;
        }

        .MuiPickersDay-root.Mui-selected {
          background: rgb(135, 35, 65) !important;
          color: white !important;
        }

        .MuiPickersDay-root.Mui-selected:hover {
          background: rgb(110, 25, 50) !important;
        }

        .MuiPickersDay-root.Mui-disabled {
          color: rgba(255, 255, 255, 0.3) !important;
        }

        .MuiClock-root {
          background: rgb(9, 18, 44) !important;
        }

        .MuiClockNumber-root {
          color: white !important;
        }

        .MuiClockNumber-root.Mui-selected {
          background: rgb(135, 35, 65) !important;
          color: white !important;
        }

        .MuiClockPointer-root {
          background: rgb(135, 35, 65) !important;
        }

        .MuiClockPointer-thumb {
          background: rgb(135, 35, 65) !important;
          border-color: rgb(135, 35, 65) !important;
        }

        .MuiPickersLayout-root {
          background: rgb(9, 18, 44) !important;
        }

        .MuiDialogActions-root button {
          color: rgb(135, 35, 65) !important;
        }

        .MuiButton-root {
          color: rgb(135, 35, 65) !important;
        }

        .MuiButton-root:hover {
          background: rgba(135, 35, 65, 0.1) !important;
        }

        .MuiPickersToolbar-root {
          background: rgba(135, 35, 65, 0.2) !important;
        }

        .MuiTypography-root {
          color: white !important;
        }

        .MuiMultiSectionDigitalClock-root {
          background: rgb(9, 18, 44) !important;
        }

        .MuiMenuItem-root {
          color: white !important;
          background: rgb(9, 18, 44) !important;
        }

        .MuiMenuItem-root:hover {
          background: rgba(135, 35, 65, 0.2) !important;
        }

        .MuiMenuItem-root.Mui-selected {
          background: rgba(135, 35, 65, 0.3) !important;
        }

        .MuiList-root {
          background: rgb(9, 18, 44) !important;
        }

        .MuiPickersArrowSwitcher-button {
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .MuiPickersArrowSwitcher-button:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }

        .MuiClock-pin {
          background: rgb(135, 35, 65) !important;
        }

        .MuiClockNumber-root:hover {
          background: rgba(135, 35, 65, 0.2) !important;
        }

        .MuiPickersYear-yearButton {
          color: white !important;
        }

        .MuiPickersYear-yearButton:hover {
          background: rgba(135, 35, 65, 0.2) !important;
        }

        .MuiPickersYear-yearButton.Mui-selected {
          background: rgb(135, 35, 65) !important;
          color: white !important;
        }

        .MuiPickersMonth-monthButton {
          color: white !important;
        }

        .MuiPickersMonth-monthButton:hover {
          background: rgba(135, 35, 65, 0.2) !important;
        }

        .MuiPickersMonth-monthButton.Mui-selected {
          background: rgb(135, 35, 65) !important;
          color: white !important;
        }

        .MuiMultiSectionDigitalClockSection-root {
          background: rgb(9, 18, 44) !important;
        }

        .MuiMultiSectionDigitalClockSection-item {
          color: white !important;
        }

        .MuiMultiSectionDigitalClockSection-item:hover {
          background: rgba(135, 35, 65, 0.2) !important;
        }

        .MuiMultiSectionDigitalClockSection-item.Mui-selected {
          background: rgb(135, 35, 65) !important;
          color: white !important;
        }

        .MuiPickersPopper-root .MuiPaper-root {
          background: rgb(9, 18, 44) !important;
        }

        .MuiInputLabel-root {
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .MuiInputLabel-root.Mui-focused {
          color: rgb(135, 35, 65) !important;
        }

        /* Modern Input Styles */
        .modern-input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 8px;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.05) !important;
          color: white !important;
          -webkit-text-fill-color: white !important;
          transition: all 0.2s ease;
        }

        .modern-input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.5) !important;
        }

        .modern-input:focus {
          outline: none;
          border-color: rgb(135, 35, 65) !important;
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.15) !important;
        }

        .modern-textarea {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 8px;
          font-size: 14px;
          background: rgba(255, 255, 255, 0.05) !important;
          color: white !important;
          -webkit-text-fill-color: white !important;
          transition: all 0.2s ease;
          resize: vertical;
          min-height: 80px;
        }

        .modern-textarea::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.5) !important;
        }

        .modern-textarea:focus {
          outline: none;
          border-color: rgb(135, 35, 65) !important;
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.15) !important;
        }

        .form-group input:disabled {
          background-color: rgba(255, 255, 255, 0.02) !important;
          color: rgba(255, 255, 255, 0.4) !important;
          cursor: not-allowed;
          opacity: 0.5;
        }

        .form-group select {
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='white' d='M6 9L1 4h10z'/%3E%3C/svg%3E") !important;
          background-repeat: no-repeat !important;
          background-position: right 12px center !important;
          padding-right: 36px !important;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        /* File Types Container */
        .file-types-container {
          margin-top: 8px;
        }

        .file-types-layout {
          display: flex;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 8px;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.05) !important;
        }

        .categories-panel {
          width: 200px;
          background: rgba(255, 255, 255, 0.03) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .categories-list {
          display: flex;
          flex-direction: column;
        }

        .category-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          color: white !important;
        }

        .category-item:last-child {
          border-bottom: none;
        }

        .category-item:hover {
          background: rgba(135, 35, 65, 0.2) !important;
        }

        .category-item.active {
          background: rgba(135, 35, 65, 0.2) !important;
        }

        .category-item.has-selection {
          background: rgba(135, 35, 65, 0.15) !important;
          color: white !important;
        }

        .category-name {
          font-weight: 500;
          color: white !important;
          font-size: 14px;
        }

        .category-count {
          background: rgb(135, 35, 65) !important;
          color: white;
          font-size: 12px;
          padding: 2px 6px;
          border-radius: 10px;
          font-weight: 600;
        }

        .file-types-panel {
          flex: 1;
          background: rgba(255, 255, 255, 0.03) !important;
        }

        .panel-header {
          background: rgba(255, 255, 255, 0.05) !important;
          padding: 12px 16px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .panel-header h5 {
          margin: 0;
          color: white !important;
          font-size: 14px;
          font-weight: 600;
        }

        .file-types-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
          gap: 8px;
          padding: 16px;
        }

        .file-type-option {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.2s ease;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          background: rgba(255, 255, 255, 0.03) !important;
          color: white !important;
        }

        .file-type-option:hover {
          background: rgba(135, 35, 65, 0.15) !important;
          border-color: rgb(135, 35, 65) !important;
        }

        .file-type-option.selected {
          background: rgba(135, 35, 65, 0.25) !important;
          border-color: rgb(135, 35, 65) !important;
          color: white !important;
        }

        .file-type-option input[type="checkbox"] {
          width: auto;
          margin: 0;
        }

        .file-type-label {
          font-size: 12px;
          font-weight: 500;
          color: white !important;
        }

        .file-type-option.selected .file-type-label {
          color: white !important;
        }

        .no-category-selected {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 200px;
          color: rgba(255, 255, 255, 0.4) !important;
          font-style: italic;
        }

        .selected-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.05) !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .summary-info {
          font-size: 14px;
          color: white !important;
        }

        .selected-count {
          color: rgba(255, 255, 255, 0.7) !important;
          font-weight: 600;
        }

        .no-selection {
          color: rgba(255, 255, 255, 0.5) !important;
        }

        .clear-all-btn {
          background: rgba(244, 67, 54, 0.2) !important;
          border: 1px solid rgb(244, 67, 54) !important;
          color: white !important;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .clear-all-btn:hover {
          background: rgba(244, 67, 54, 0.3) !important;
        }

        /* Modern File Upload Styles */
        .modern-file-upload {
          margin-top: 8px;
        }

        .file-input {
          display: none;
        }

        .file-upload-label {
          display: block;
          border: 2px dashed rgba(255, 255, 255, 0.3) !important;
          border-radius: 12px;
          padding: 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.03) !important;
          position: relative;
          overflow: hidden;
        }

        .file-upload-label:hover {
          border-color: rgb(135, 35, 65) !important;
          background: rgba(135, 35, 65, 0.1) !important;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.25) !important;
        }

        .file-selected {
          display: flex;
          align-items: center;
          gap: 12px;
          color: white !important;
          background: rgba(135, 35, 65, 0.2) !important;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid rgb(135, 35, 65) !important;
        }

        .file-details {
          flex: 1;
          text-align: left;
        }

        .file-name {
          display: block;
          font-weight: 500;
          color: white !important;
          margin-bottom: 4px;
        }

        .file-size {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .remove-file-btn {
          background: rgba(244, 67, 54, 0.2) !important;
          border: 1px solid rgb(244, 67, 54) !important;
          border-radius: 6px;
          padding: 6px;
          cursor: pointer;
          color: white !important;
          transition: all 0.2s ease;
        }

        .remove-file-btn:hover {
          background: rgba(244, 67, 54, 0.3) !important;
          transform: scale(1.05);
        }

        .file-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: white !important;
        }

        .file-placeholder small {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6) !important;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h4 {
          margin: 0;
          color: white !important;
          font-size: 16px;
          font-weight: 600;
          font-family: Georgia, 'Times New Roman', Times, serif;
        }

        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .btn-primary {
          background: rgb(135, 35, 65) !important;
          color: white !important;
          border: none !important;
        }

        .btn-primary:hover:not(:disabled) {
          background: rgb(110, 25, 50) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(135, 35, 65, 0.3) !important;
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: rgb(80, 75, 56) !important;
          color: white !important;
        }

        .btn-secondary:hover {
          background: rgb(61, 56, 41) !important;
        }

        .btn-outline {
          background: transparent !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          color: white !important;
        }

        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.1) !important;
        }

        .btn-sm {
          padding: 4px 10px;
          font-size: 11px;
          white-space: nowrap;
        }

        .btn-icon {
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          color: rgba(255, 255, 255, 0.7) !important;
          transition: all 0.2s ease;
        }

        .btn-icon:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          color: white !important;
        }

        .btn-icon.danger {
          color: rgb(244, 67, 54) !important;
        }

        .btn-icon.danger:hover {
          background: rgba(244, 67, 54, 0.1) !important;
        }

        .phases-section {
          margin-top: 16px;
        }

        .phase-card {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .add-phase-container {
          display: flex;
          justify-content: center;
          margin-top: 24px;
          padding: 20px;
        }

        .phase-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          padding: 12px;
          background: rgba(135, 35, 65, 0.15) !important;
          border-radius: 6px;
          border: 1px solid rgba(135, 35, 65, 0.3);
        }

        .phase-header h4 {
          margin: 0;
          color: white !important;
          font-size: 16px;
          font-weight: 600;
          font-family: Georgia, 'Times New Roman', Times, serif;
        }

        .builtin-evaluation-builder {
          margin-top: 16px;
        }

        .evaluation-total {
          text-align: center;
          padding: 12px;
          background: rgba(135, 35, 65, 0.15) !important;
          border: 2px solid rgb(135, 35, 65) !important;
          border-radius: 8px;
          margin-bottom: 16px;
          color: white !important;
          font-size: 14px;
        }

        .evaluation-card {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 8px;
        }

        .evaluation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .evaluation-points {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .criterion-name {
          flex: 1;
          margin-right: 8px;
        }

        .modern-evaluation-card .criterion-name {
          flex: 1;
          margin-right: 8px;
        }

        .points-input {
          width: 60px;
        }

        .help-text {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.9) !important;
          margin-top: 4px;
        }

        .error-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: rgba(244, 67, 54, 0.2) !important;
          border: 1px solid rgb(244, 67, 54) !important;
          border-radius: 6px;
          color: white !important;
          margin-bottom: 16px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 2px solid rgba(255, 255, 255, 0.1) !important;
          background: rgb(9, 18, 44) !important;
        }

        .form-section {
          margin-bottom: 24px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.03) !important;
        }

        .form-section h4 {
          margin: 0 0 16px 0;
          color: white !important;
          font-size: 16px;
          font-weight: 600;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          padding-bottom: 8px;
          font-family: Georgia, 'Times New Roman', Times, serif;
        }

        /* Builders Container */
        .builders-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-top: 24px;
          overflow: hidden;
        }

        .builders-container.single-builder {
          grid-template-columns: 1fr;
        }

        .builder-section {
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px;
          padding: 24px;
          min-width: 0;
          overflow-y: auto;
          max-height: 80vh;
        }

        .builder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1) !important;
          gap: 12px;
        }

        .builder-header h5 {
          margin: 0;
          color: white !important;
          font-size: 16px;
          font-weight: 600;
          font-family: Georgia, 'Times New Roman', Times, serif;
          flex-shrink: 0;
        }

        .builder-header > div {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .rubric-total, .evaluation-total {
          text-align: center;
          padding: 16px;
          background: rgba(135, 35, 65, 0.15) !important;
          border: 1px solid rgb(135, 35, 65) !important;
          border-radius: 8px;
          margin-bottom: 24px;
          color: white !important;
          font-size: 16px;
          font-weight: 600;
        }

        .evaluation-total {
          text-align: center;
          padding: 16px;
          background: rgba(135, 35, 65, 0.15) !important;
          border: 1px solid rgb(135, 35, 65) !important;
          border-radius: 8px;
          margin-bottom: 24px;
          color: white !important;
          font-size: 16px;
          font-weight: 600;
        }

        .rubric-criteria-grid, .evaluation-criteria-grid {
          display: flex;
          flex-direction: column;
          gap: 0;
          min-width: 0;
          overflow: hidden;
        }

        .modern-rubric-card {
          background: rgba(255, 255, 255, 0.03) !important;
          border: none;
          border-radius: 0;
          padding: 24px 0;
          margin-bottom: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
          transition: all 0.2s ease;
        }

        .modern-rubric-card:last-child {
          border-bottom: none;
        }

        .modern-rubric-card:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }

        .modern-evaluation-card {
          background: rgba(255, 255, 255, 0.03) !important;
          border: none;
          border-radius: 0;
          padding: 24px 0;
          margin-bottom: 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        
        }

        .modern-evaluation-card:last-child {
          border-bottom: none;
        }

        .modern-evaluation-card:hover {
          background: rgba(255, 255, 255, 0.05) !important;
        }

        .rubric-header, .evaluation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .modern-evaluation-card .evaluation-header {
          cursor: default;
          background: transparent !important;
        }

        .modern-evaluation-card .evaluation-header:hover {
          background: transparent !important;
        }

        .criterion-name-group {
          display: flex;
          align-items: center;
          gap: 20px;
          flex: 1;
        }

        .rubric-points, .evaluation-points {
          display: flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          padding: 0;
          border: none;
        }

        .rubric-points span,
        .evaluation-points span {
          color: white !important;
          font-weight: 500;
          font-size: 14px;
        }

        .points-input {
          width: 80px;
          text-align: center;
          font-weight: 600;
          padding: 8px 12px;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05) !important;
          color: white !important;
          -webkit-text-fill-color: white !important;
        }

        .points-input::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
          -webkit-text-fill-color: rgba(255, 255, 255, 0.5) !important;
        }

        .points-input:focus {
          border-color: rgb(135, 35, 65) !important;
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.15) !important;
        }

        .validation-warning {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(255, 152, 0, 0.2) !important;
          border: 1px solid rgb(255, 152, 0) !important;
          border-radius: 6px;
          color: white !important;
          font-size: 12px;
          font-weight: 500;
        }

        .validation-warning svg {
          color: rgb(255, 152, 0) !important;
        }

        /* Timeline Buffers (Evaluation and Breathe Phases) */
        .timeline-buffers-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin: 20px 0;
        }

        .buffer-card {
          padding: 16px;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
          transition: all 0.2s ease;
        }

        .buffer-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
          border-color: rgb(135, 35, 65) !important;
        }

        .buffer-card h4 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          color: white !important;
        }

        .buffer-dates {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          background: rgba(9, 18, 44, 0.6) !important;
          border-radius: 4px;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .date-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .date-item label {
          font-size: 12px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6) !important;
          text-transform: uppercase;
        }

        .date-item span {
          font-size: 13px;
          color: white !important;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .two-column-project-modal {
            width: 95%;
            max-width: none;
            max-height: 95vh;
          }
          
          .modal-body {
            flex-direction: column;
          }
          
          .steps-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #EBE5C2;
          }
          
          .steps-list {
            flex-direction: row;
            overflow-x: auto;
          }
          
          .step-item {
            min-width: 200px;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .builders-container {
            grid-template-columns: 1fr;
            gap: 16px;
          }
          
          .modal-footer {
            flex-direction: column;
          }
        }
      `}</style>

      {/* Preset Mode Modal */}
      {showPresetMode && (
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
          zIndex: 10000,
          padding: '2rem'
        }} onClick={() => setShowPresetMode(false)}>
          <div style={{
            background: 'rgba(9, 18, 44, 0.15)',
            border: 'none',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            borderRadius: '0px',
            maxWidth: '1100px',
            width: '95vw',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Crosshair corners */}
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

            {/* Header */}
            <div style={{
              padding: '1.5rem 2rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              background: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ 
                  margin: 0, 
                  fontSize: '1.5rem', 
                  fontWeight: '700',
                  color: 'rgb(135, 35, 65)'
                }}>
                  Choose a Project Preset
                </h3>
                <p style={{ 
                  margin: '0.5rem 0 0 0', 
                  fontSize: '0.875rem', 
                  color: 'rgb(60, 60, 60)'
                }}>
                  {course?.course_name} ({course?.course_code})
                </p>
              </div>
              <button
                onClick={() => setShowPresetMode(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgb(135, 35, 65)',
                  cursor: 'pointer',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(135, 35, 65, 0.1)';
                  e.currentTarget.style.transform = 'rotate(90deg)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.transform = 'rotate(0deg)';
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div style={{
              padding: '2rem',
              flex: 1,
              overflowY: 'auto',
              background: 'rgb(20, 30, 60)'
            }}>
              {/* Required Fields Warning */}
              {!isProjectSetupComplete() && (
                <div style={{
                  background: 'rgba(255, 152, 0, 0.1)',
                  border: '2px solid rgb(255, 152, 0)',
                  borderRadius: '8px',
                  padding: '1.25rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'start'
                }}>
                  <AlertCircle size={24} style={{ color: 'rgb(255, 152, 0)', flexShrink: 0 }} />
                  <div>
                    <h4 style={{
                      margin: '0 0 0.5rem 0',
                      color: 'white',
                      fontSize: '1rem',
                      fontWeight: '700'
                    }}>
                      Complete Project Setup First
                    </h4>
                    <p style={{
                      margin: 0,
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.875rem',
                      lineHeight: '1.5'
                    }}>
                      Before using a preset, please complete the following in the <strong>Project Setup</strong> step:
                    </p>
                    <ul style={{
                      margin: '0.75rem 0 0 0',
                      paddingLeft: '1.5rem',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.875rem'
                    }}>
                      {getMissingFields().map((field, index) => (
                        <li key={index} style={{ marginBottom: '0.25rem' }}>
                          <strong>{field}</strong>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Configuration Section */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '1.5rem'
              }}>
                <h4 style={{
                  margin: '0 0 1rem 0',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Calendar size={20} />
                  Preset Configuration
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Phase Duration */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.875rem'
                    }}>
                      Phase Duration (Days) <span style={{ color: 'rgb(244, 67, 54)' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={presetPhaseDuration}
                      onChange={(e) => setPresetPhaseDuration(parseInt(e.target.value) || 7)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '6px',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.2s',
                        background: 'rgba(255, 255, 255, 0.05)',
                        color: 'white'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgb(135, 35, 65)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      }}
                    />
                    <p style={{
                      margin: '0.5rem 0 0 0',
                      fontSize: '0.75rem',
                      color: 'rgba(255, 255, 255, 0.6)'
                    }}>
                      Each phase will be {presetPhaseDuration} day{presetPhaseDuration !== 1 ? 's' : ''} long
                    </p>
                  </div>

                  {/* Current Settings Summary */}
                  <div>
                    <label style={{
                      display: 'block',
                      marginBottom: '0.5rem',
                      fontWeight: '600',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '0.875rem'
                    }}>
                      Current Settings
                    </label>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '6px',
                      padding: '0.75rem',
                      fontSize: '0.813rem',
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Start Date:</strong> {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'Not set'}
                      </div>
                      <div style={{ marginBottom: '0.5rem' }}>
                        <strong>Evaluation:</strong> {formData.evaluationPhaseDays || 0} day{formData.evaluationPhaseDays !== 1 ? 's' : ''}
                      </div>
                      <div>
                        <strong>Breathe Period:</strong> {formData.breathePhaseDays || 0} day{formData.breathePhaseDays !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preset Projects Grid */}
              <div>
                <h4 style={{
                  margin: '0 0 1rem 0',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <FileText size={20} />
                  Available Presets ({availablePresets.length})
                </h4>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '1rem'
                }}>
                  {availablePresets.map((preset, index) => {
                    const canApply = isProjectSetupComplete();
                    
                    return (
                      <div
                        key={index}
                        onClick={() => canApply && applyPreset(preset)}
                        style={{
                          background: canApply ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
                          border: canApply ? '2px solid rgba(255, 255, 255, 0.1)' : '2px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          padding: '1.5rem',
                          cursor: canApply ? 'pointer' : 'not-allowed',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          overflow: 'hidden',
                          opacity: canApply ? 1 : 0.5
                        }}
                        onMouseEnter={(e) => {
                          if (canApply) {
                            e.currentTarget.style.borderColor = 'rgb(135, 35, 65)';
                            e.currentTarget.style.transform = 'translateY(-4px)';
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(135, 35, 65, 0.3)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (canApply) {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                      >
                        {!canApply && (
                          <div style={{
                            position: 'absolute',
                            top: '0.75rem',
                            right: '0.75rem',
                            background: 'rgb(255, 152, 0)',
                            color: 'white',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <AlertCircle size={12} />
                            LOCKED
                          </div>
                        )}
                        
                        <h4 style={{
                          margin: '0 0 0.75rem 0',
                          color: canApply ? 'white' : 'rgba(255, 255, 255, 0.5)',
                          fontSize: '1.125rem',
                          fontWeight: '700',
                          paddingRight: canApply ? '0' : '4rem'
                        }}>
                          {preset.title}
                        </h4>
                        <p style={{
                          margin: '0 0 1rem 0',
                          color: canApply ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.4)',
                          fontSize: '0.875rem',
                          lineHeight: '1.5'
                        }}>
                          {preset.description}
                        </p>
                        
                        {/* Phase badges */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem'
                        }}>
                          <div style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            color: 'rgba(255, 255, 255, 0.6)',
                            marginBottom: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                          }}>
                            <span style={{
                              background: 'rgba(135, 35, 65, 0.3)',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: '700'
                            }}>
                              {preset.phases.length} PHASES
                            </span>
                          </div>
                          {preset.phases.map((phase, phaseIndex) => (
                            <div
                              key={phaseIndex}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '4px',
                                fontSize: '0.813rem',
                                color: canApply ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.4)',
                                borderLeft: '3px solid rgb(135, 35, 65)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <span style={{
                                background: 'rgb(135, 35, 65)',
                                color: 'white',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                flexShrink: 0
                              }}>
                                {phaseIndex + 1}
                              </span>
                              {phase}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {availablePresets.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: 'rgba(255, 255, 255, 0.6)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px dashed rgba(255, 255, 255, 0.1)'
                  }}>
                    <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ margin: 0, fontSize: '1rem' }}>
                      No presets available for this course code.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1.5rem 2rem',
              borderTop: '2px solid rgba(255, 255, 255, 0.1)',
              background: 'rgb(20, 30, 60)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: '0.813rem',
                color: 'rgba(255, 255, 255, 0.7)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Info size={16} />
                Click on a preset to auto-fill project and phases
              </div>
              <button
                onClick={() => setShowPresetMode(false)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  color: 'white'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimplifiedProjectCreator;
