import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './CourseProfessorDashboard.css';
import './ProjectsLandingStyles.css';
import './GroupsStyles.css';
import './GroupModalStyles.css';
import { apiConfig, API_BASE_URL } from '../config/api';
import EditProjectModal from './EditProjectModal';
import WarningModal from './WarningModal';
import AnnouncementModal from './AnnouncementModal';
import AnnouncementComments from './AnnouncementComments';
import * as XLSX from 'xlsx';
import { 
  FaHome, FaUsers, FaProjectDiagram, FaTasks, FaGraduationCap, 
  FaBullhorn, FaBell, FaClipboardList, FaCog, FaBars, FaArrowLeft,
  FaPlus, FaShuffle, FaEye, FaUpload, FaSyncAlt, FaCrown, FaSync,
  FaUser, FaEdit, FaTrash, FaChartBar, FaFileAlt, FaUserCog,
  FaCalendarAlt, FaBookmark, FaEnvelope, FaClock, FaUserPlus, FaChartLine,
  FaSearch, FaCopy, FaExclamationTriangle, FaTag, FaPaperclip, FaDownload, FaFile,
  FaChartPie, FaExclamationCircle, FaCheckCircle, FaLayerGroup, FaComments,
  FaChevronDown, FaSort, FaSpinner, FaCloudUploadAlt, FaTimes, FaInbox, FaThList,
  FaFilePdf, FaInfoCircle, FaArrowRight, FaPlay, FaStop, FaWind, FaClipboardCheck, FaPaperPlane
} from 'react-icons/fa';
import { AlertCircle, Users, Eye, X } from 'lucide-react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import SimplifiedGroupCreator from './SimplifiedGroupCreator';
import SimplifiedProjectCreator from './SimplifiedProjectCreator';
import SimplifiedGradingDashboard from './SimplifiedGradingDashboard';
import './CourseStudentDashboard.css'; // Use the same CSS as student dashboard

// Import the new UI components
import { AppSidebar } from './app-sidebar';
import { SiteHeader } from './site-header';
import { SidebarProvider, SidebarInset, useSidebar } from './ui/sidebar';
import { Separator } from './ui/separator';
import { SidebarTrigger } from './ui/sidebar';
import Squares from './Squares';

// Group Modal Wrapper Component with Sidebar Control
const GroupModalWrapper = ({ group, students, onClose, onDelete, getSupabaseImageUrl }) => {
  const { toggleSidebar } = useSidebar();

  // Auto-close sidebar when modal opens
  React.useEffect(() => {
    // Try to close sidebar by finding and clicking the sidebar trigger
    const sidebarTrigger = document.querySelector('[data-sidebar-trigger]');
    if (sidebarTrigger) {
      sidebarTrigger.click();
    }
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }} onClick={onClose}>
      <div style={{
        background: 'rgba(9, 18, 44, 0.15)',
        border: 'none',
        boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
        backdropFilter: 'blur(3.2px) saturate(120%)',
        borderRadius: '0px',
        maxWidth: '900px',
        width: '90vw',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          background: 'white',
          borderBottom: '2px solid rgb(135, 35, 65)',
          padding: '1.5rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              margin: '0',
              color: 'rgb(20, 30, 60)'
            }}>
              {group.group_name}
            </h2>
            <span style={{
              display: 'inline-block',
              background: (group.course_group_members?.length || 0) >= (group.max_members || 5) ? 'rgb(76, 175, 80)' : 'rgb(255, 152, 0)',
              color: 'white',
              padding: '0.35rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              {(group.course_group_members?.length || 0) >= (group.max_members || 5) ? 'Complete' : 'Incomplete'}
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgb(20, 30, 60)',
              cursor: 'pointer',
              fontSize: '1.5rem',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(135, 35, 65, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '2rem',
          flex: 1,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '2rem',
          background: 'rgb(20, 30, 60)'
        }}>
          {/* Members Section */}
          <div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: 'white',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaUsers size={18} />
              Members ({group.course_group_members?.length || 0})
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              {group.course_group_members?.map(member => {
                const student = students.find(s => s.student_id === member.student_id || s.id === member.student_id);
                const name = student ? `${student.first_name} ${student.last_name}` : `${member.student_first_name || 'Unknown'} ${member.student_last_name || ''}`;
                const isLeader = member.role === 'leader';
                
                return (
                  <div key={member.student_id} style={{
                    background: isLeader ? 'rgba(135, 35, 65, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    border: isLeader ? '1px solid rgb(135, 35, 65)' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center'
                  }}>
                    <div style={{
                      position: 'relative',
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'rgb(135, 35, 65)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {student?.profile_image_url ? (
                        <img 
                          src={getSupabaseImageUrl(student.profile_image_url)} 
                          alt={name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        style={{ 
                          display: student?.profile_image_url ? 'none' : 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '0.875rem'
                        }}
                      >
                        {(student?.first_name?.[0] || member.student_first_name?.[0] || '').toUpperCase()}
                        {(student?.last_name?.[0] || member.student_last_name?.[0] || '').toUpperCase()}
                      </div>
                      {isLeader && (
                        <div style={{
                          position: 'absolute',
                          bottom: '-4px',
                          right: '-4px',
                          background: 'rgb(255, 193, 7)',
                          borderRadius: '50%',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <FaCrown size={10} style={{ color: '#333' }} />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.938rem',
                        marginBottom: '0.25rem'
                      }}>
                        {name}
                        {isLeader && (
                          <span style={{
                            marginLeft: '0.5rem',
                            background: 'rgb(135, 35, 65)',
                            color: 'white',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '3px',
                            fontSize: '0.7rem',
                            fontWeight: '700'
                          }}>
                            LEADER
                          </span>
                        )}
                      </div>
                      <div style={{
                        color: 'rgb(180, 180, 180)',
                        fontSize: '0.813rem'
                      }}>
                        {student?.student_number || member.student_id}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Details Section */}
          <div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: '700',
              color: 'white',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FaChartBar size={18} />
              Group Details
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{ fontSize: '0.813rem', color: 'rgb(180, 180, 180)', marginBottom: '0.5rem' }}>
                  STATUS
                </div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: (group.course_group_members?.length || 0) >= (group.max_members || 5) ? 'rgb(76, 175, 80)' : 'rgb(255, 152, 0)'
                }}>
                  {(group.course_group_members?.length || 0) >= (group.max_members || 5) ? 'Complete' : 'Incomplete'}
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{ fontSize: '0.813rem', color: 'rgb(180, 180, 180)', marginBottom: '0.5rem' }}>
                  MEMBER COUNT
                </div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'white'
                }}>
                  {group.course_group_members?.length || 0} / {group.max_members || 'unlimited'}
                </div>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <div style={{ fontSize: '0.813rem', color: 'rgb(180, 180, 180)', marginBottom: '0.5rem' }}>
                  MINIMUM REQUIRED
                </div>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: 'white'
                }}>
                  {group.min_members || 3} members
                </div>
              </div>

              {group.created_at && (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ fontSize: '0.813rem', color: 'rgb(180, 180, 180)', marginBottom: '0.5rem' }}>
                    CREATED
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: 'white'
                  }}>
                    {new Date(group.created_at).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.5rem 2rem',
          background: 'rgb(20, 30, 60)',
          display: 'flex',
          gap: '1rem',
          justifyContent: 'flex-end'
        }}>
          <button 
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: '1px solid rgb(135, 35, 65)',
              background: 'transparent',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: '0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgb(135, 35, 65)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Close
          </button>
          <button 
            onClick={() => {
              if (window.confirm('Delete this group and all its data? This cannot be undone.')) {
                onDelete(group.id);
              }
            }}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              background: 'rgb(244, 67, 54)',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: '0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgb(229, 57, 53)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(244, 67, 54, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgb(244, 67, 54)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <FaTrash size={14} />
            Delete Group
          </button>
        </div>
      </div>
    </div>
  );
};

const CourseProfessorDashboard = () => {
  // Helper function to format UTC dates correctly without timezone shift
  const formatUTCDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    // Extract UTC components to avoid timezone conversion
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();
    const day = date.getUTCDate();
    // Create a date in local timezone with the same numbers
    return new Date(year, month, day).toLocaleDateString();
  };

  // Helper function to format date with time in AM/PM format
  const formatDateWithTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    
    // Get date parts
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    
    // Get time parts
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    
    return `${month}/${day}/${year} ${hours}:${minutesStr} ${ampm}`;
  };

  // Helper function to construct proper Supabase image URLs
  const constructSupabaseImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // If it's already a full URL, return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Construct Supabase storage URL
    // imagePath format: "student-id/filename" or just "filename"
    const SUPABASE_BASE_URL = 'https://qorkowgfjjuwxelumuut.supabase.co';
    const BUCKET_NAME = 'studentaccounts';
    
    return `${SUPABASE_BASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${imagePath}`;
  };

  const [course, setCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('course-overview');
  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [projects, setProjects] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [recentSubmissions, setRecentSubmissions] = useState([]);
  const [submissionActivity, setSubmissionActivity] = useState([]);
  const [taskSubmissions, setTaskSubmissions] = useState([]);
  const [revisionSubmissions, setRevisionSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [selectedProjectForGrading, setSelectedProjectForGrading] = useState(null);
  const [gradingProject, setGradingProject] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradingSidebarCollapsed, setGradingSidebarCollapsed] = useState(false);
  const [submissions, setSubmissions] = useState({ projectSubmissions: [], phaseSubmissions: [] });
  const [activeSubmissionType, setActiveSubmissionType] = useState('project');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentsActiveTab, setStudentsActiveTab] = useState('enrolled'); // 'enrolled' or 'pending'
  const [studentSortBy, setStudentSortBy] = useState('last-name-first'); // 'last-name-first', 'first-name-first', 'student-number'
  const [lastUpdated, setLastUpdated] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedAttempts, setSelectedAttempts] = useState({}); // Track selected attempt per task: { taskId: attemptNumber }
  const [selectedSubmissionVersion, setSelectedSubmissionVersion] = useState(0); // Track selected submission version (0 = original, 1+ = resubmission)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [projectToDelete, setProjectToDelete] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [selectedGroupForDetails, setSelectedGroupForDetails] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectFilter, setProjectFilter] = useState('current'); // 'all', 'current', 'past'
  const [searchQuery, setSearchQuery] = useState('');
  const [detailedProject, setDetailedProject] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState({}); // Track which phases are expanded
  const [submissionTimePeriod, setSubmissionTimePeriod] = useState(3); // 3 or 6 months
  const [taskWeeksPeriod, setTaskWeeksPeriod] = useState(4); // 4 or 10 weeks
  const [submissionFilter, setSubmissionFilter] = useState('ungraded'); // 'ungraded', 'graded', 'all'
  
  // Grading state (NEW REDESIGNED VERSION)
  const [selectedGradingProject, setSelectedGradingProject] = useState(null);
  const [gradingSortBy, setGradingSortBy] = useState('recently-assigned');
  const [selectedSubmissionCategory, setSelectedSubmissionCategory] = useState(null); // 'project' or phase object
  // Note: selectedSubmission already declared on line 222
  
  // New Grading Redesign State
  const [gradingViewMode, setGradingViewMode] = useState('overview'); // 'overview', 'submissions'
  const [gradingFilterType, setGradingFilterType] = useState('all'); // 'all', 'projects', 'phases'
  const [gradingSortOption, setGradingSortOption] = useState('ungraded'); // 'ungraded', 'recent', 'alphabetical'
  const [selectedGradingSubmission, setSelectedGradingSubmission] = useState(null);
  const [gradingStats, setGradingStats] = useState({
    totalSubmissions: 0,
    ungradedSubmissions: 0,
    gradedSubmissions: 0,
    totalProjects: 0,
    totalPhases: 0
  });
  
  // Actual submissions data from database
  const [phaseSubmissions, setPhaseSubmissions] = useState([]);
  const [projectSubmissions, setProjectSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [selectedSubmissionToGrade, setSelectedSubmissionToGrade] = useState(null);
  
  // Grading modal state
  const [gradeValue, setGradeValue] = useState('');
  const [feedback, setFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [groupGrade, setGroupGrade] = useState(88); // Group grade for current submission
  
  // Professor profile state
  const [professorProfile, setProfessorProfile] = useState(null);
  
  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementFilter, setAnnouncementFilter] = useState('all');
  const [announcementSearchQuery, setAnnouncementSearchQuery] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  
  // Student Assignment State (for opening group modal with manual assignment tab)
  const [studentToAssign, setStudentToAssign] = useState(null);
  
  // Grade Submissions state
  const [gradeSubmissionsView, setGradeSubmissionsView] = useState({
    selectedProject: null,
    showProjectDropdown: false,
    loading: false,
    phases: [],
    selectedPhase: null,
    detailsData: [],
    selectedSubmission: null,
    selectedTask: null,
    selectedAttempt: null
  });

  const [gradeSubmissionsSortBy, setGradeSubmissionsSortBy] = useState('date');
  const [showGradeSubmissionsSortDropdown, setShowGradeSubmissionsSortDropdown] = useState(false);
  
  // Grade Submissions filter and search state (moved from renderGradeSubmissions)
  const [activeSubmissionFilter, setActiveSubmissionFilter] = useState('all');
  const [gradeSearchQuery, setGradeSearchQuery] = useState('');
  const [gradeSortBy, setGradeSortBy] = useState('recent');
  const [showGradeSortDropdown, setShowGradeSortDropdown] = useState(false);
  const [gradeFilterStatus, setGradeFilterStatus] = useState('ungraded'); // Filter by grading status: 'ungraded', 'graded', 'all'
  const [showGradeFilterDropdown, setShowGradeFilterDropdown] = useState(false); // Dropdown visibility for grade filter

  // Grade Submissions - New sections state (Member Submissions, Evaluations, Inclusion)
  const [expandedMemberPhases, setExpandedMemberPhases] = useState({}); // Track expanded phases per member: { [memberId]: { [phaseId]: true/false } }
  const [memberInclusions, setMemberInclusions] = useState({});
  const [inclusionFeedback, setInclusionFeedback] = useState({});
  const [expandedReasonFields, setExpandedReasonFields] = useState({});
  const [expandedEvalCards, setExpandedEvalCards] = useState({});
  const [evalMemberPage, setEvalMemberPage] = useState(0);
  const [memberEvaluations, setMemberEvaluations] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [memberPage, setMemberPage] = useState(0);
  const [memberTasks, setMemberTasks] = useState({});
  const [memberProfileImages, setMemberProfileImages] = useState({}); // New state for member profile images
  const [viewingEvaluationModal, setViewingEvaluationModal] = useState(null); // { memberId, memberName, evaluationForm }
  const [showRubricModal, setShowRubricModal] = useState(false);
  const [rubricContent, setRubricContent] = useState(null);
  
  // Compute group members with profile images - this will re-compute when memberProfileImages changes
  const computedGroupMembers = useMemo(() => {
    const selectedSubmissionData = gradeSubmissionsView.selectedSubmission || gradeSubmissionsView.selectedTask;
    
    // Helper function to extract member ID from various possible field names
    const extractMemberId = (member) => {
      return member.member_id || member.memberId || member.student_id || member.studentId || member.id;
    };
    
    if (!selectedSubmissionData) {
      return [];
    }

    // Try memberTasks first
    if (selectedSubmissionData.memberTasks && selectedSubmissionData.memberTasks.length > 0) {
      console.log('📋 [useMemo] Extracting from memberTasks:', selectedSubmissionData.memberTasks);
      console.log('📋 [useMemo] Current memberProfileImages state:', memberProfileImages);
      return selectedSubmissionData.memberTasks.map(memberTask => {
        const memberId = extractMemberId(memberTask);
        const memberData = {
          student_id: memberId,
          id: memberId,
          full_name: memberTask.member_name || memberTask.memberName || memberTask.name,
          user_name: (memberTask.member_name || memberTask.memberName || memberTask.name)?.toLowerCase().replace(' ', ''),
          name: memberTask.member_name || memberTask.memberName || memberTask.name,
          profile_image_url: memberProfileImages[memberId] || null, // Use fetched profile images
          role: memberTask.role || 'member',
          individual_grade: memberTask.individual_grade || memberTask.individualGrade,
          individual_feedback: memberTask.individual_feedback || memberTask.individualFeedback,
          graded_at: memberTask.graded_at || memberTask.gradedAt
        };
        console.log('📋 [useMemo] Extracted member from memberTasks:', memberData);
        return memberData;
      });
    }

    // Fall back to memberInclusions if memberTasks is empty
    if (selectedSubmissionData.memberInclusions && selectedSubmissionData.memberInclusions.length > 0) {
      console.log('📋 [useMemo] Extracting from memberInclusions:', selectedSubmissionData.memberInclusions);
      console.log('📋 [useMemo] Current memberProfileImages state:', memberProfileImages);
      return selectedSubmissionData.memberInclusions.map(inclusion => {
        const memberId = extractMemberId(inclusion);
        const memberData = {
          student_id: memberId,
          id: memberId,
          full_name: inclusion.member_name || inclusion.memberName || inclusion.name,
          user_name: (inclusion.member_name || inclusion.memberName || inclusion.name)?.toLowerCase().replace(' ', ''),
          name: inclusion.member_name || inclusion.memberName || inclusion.name,
          profile_image_url: memberProfileImages[memberId] || null, // Use fetched profile images
          role: inclusion.role || 'member'
        };
        console.log('📋 [useMemo] Extracted member from memberInclusions:', memberData);
        return memberData;
      });
    }

    return [];
  }, [gradeSubmissionsView.selectedSubmission, gradeSubmissionsView.selectedTask, memberProfileImages]); // Re-compute when these change
  
  // Grade Sheet state
  const [gradeSheetData, setGradeSheetData] = useState({
    loading: false,
    projects: [],
    students: []
  });
  
  // Function to fetch detailed project data
  const fetchDetailedProject = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiConfig.baseURL}/api/professor/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const detailedProjectData = await response.json();
        
        // Parse file_types_allowed if it's a JSON string
        if (detailedProjectData.project_phases) {
          detailedProjectData.project_phases = detailedProjectData.project_phases.map(phase => ({
            ...phase,
            file_types_allowed: typeof phase.file_types_allowed === 'string' 
              ? JSON.parse(phase.file_types_allowed)
              : phase.file_types_allowed
          }));
        }
        
        setDetailedProject(detailedProjectData);
      } else {
        console.error('Failed to fetch detailed project data');
        setDetailedProject(null);
      }
    } catch (error) {
      console.error('Error fetching detailed project:', error);
      setDetailedProject(null);
    }
  };

  // Handle project selection
  const handleProjectSelection = (project) => {
    setSelectedProject(project);
    fetchDetailedProject(project.id);
  };
  // Helper function to get Supabase image URL
  const getSupabaseImageUrl = (imagePath) => {
    if (!imagePath) return null;
    
    // Log for debugging
    console.log('🖼️ Original image path:', imagePath);
    
    // Handle full URLs (shouldn't happen but just in case)
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      console.log('🖼️ Already full URL:', imagePath);
      return imagePath;
    }
    
    // Construct Supabase storage URL with correct project URL
    const baseUrl = 'https://qorkowgfjjuwxelumuut.supabase.co';
    const bucketName = 'studentaccounts';
    const fullUrl = `${baseUrl}/storage/v1/object/public/${bucketName}/${imagePath}`;
    
    console.log('🖼️ Constructed URL:', fullUrl);
    return fullUrl;
  };

  // Helper function to get status pill color and label
  const getStatusPillColor = (task) => {
    // Check if there's at least one approved attempt
    const hasApprovedAttempt = task.allAttempts?.some(attempt => attempt.status === 'approved');
    if (hasApprovedAttempt) {
      return {
        label: 'Approved',
        color: '#059669',
        backgroundColor: '#D1FAE5'
      };
    }

    // Check if pending and no file = No Submission
    const hasFile = task.files && task.files.length > 0;
    if (task.status === 'pending' && !hasFile) {
      return {
        label: 'No Submission',
        color: '#7C2D12',
        backgroundColor: '#FED7AA'
      };
    }

    // Otherwise use the task status
    if (task.status === 'completed') {
      return {
        label: 'Completed',
        color: '#059669',
        backgroundColor: '#D1FAE5'
      };
    } else if (task.status === 'pending') {
      return {
        label: 'Pending',
        color: '#DC2626',
        backgroundColor: '#FEE2E2'
      };
    } else {
      return {
        label: 'Revision',
        color: '#EA580C',
        backgroundColor: '#FFEDD5'
      };
    }
  };

  const { courseId } = useParams();
  const navigate = useNavigate();

  // Handle join request actions
  const handleJoinRequestAction = async (requestId, action) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/professor/join-request/${requestId}/${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        // Refresh data after action
        fetchCourseData();
        // If we approved a student, switch to enrolled tab to see them
        if (action === 'approve') {
          setStudentsActiveTab('enrolled');
        }
      } else {
        console.error('Failed to process join request');
      }
    } catch (error) {
      console.error('Error processing join request:', error);
    }
  };

  const handleGroupDeletion = async (groupId) => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete the group and ALL related data including:\n\n• All group members\n• All phase and project submissions\n• All task assignments and submissions\n• All evaluations and grades\n• All feedback and revisions\n\n❌ This action CANNOT be undone!\n\nAre you absolutely sure you want to proceed?')) {
      return;
    }

    try {
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'info',
        message: 'Deleting group and all related data...',
        timestamp: new Date()
      }]);

      const response = await fetch(
        `${API_BASE_URL}/api/professor/course/${courseId}/groups/${groupId}/delete-complete`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Refresh data after deletion
        await fetchCourseData();
        await fetchGroups(false);
        setSelectedGroupForDetails(null);
        
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'success',
          message: `Successfully deleted "${data.groupName}" and ${data.totalDeleted} related records`,
          timestamp: new Date(),
          details: data.deletionSummary
        }]);
      } else {
        console.error('Failed to delete group:', data);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          message: data.error || 'Failed to delete group',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: 'Network error while deleting group',
        timestamp: new Date()
      }]);
    }
  };

  // Fetch Grade Sheet Data
  const fetchGradeSheetData = async () => {
    try {
      setGradeSheetData(prev => ({ ...prev, loading: true }));
      const token = localStorage.getItem('token');
      
      // Use existing projects state or fetch if empty
      let projectsData = projects;
      if (!projectsData || projectsData.length === 0) {
        const projectsResponse = await fetch(
          `${API_BASE_URL}/api/professor/course/${courseId}/projects`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!projectsResponse.ok) {
          throw new Error('Failed to fetch projects');
        }

        projectsData = await projectsResponse.json();
      }
      console.log('📁 Projects Data:', projectsData);

      // Fetch all submissions for this course
      const submissionsResponse = await fetch(
        `${apiConfig.baseURL}/api/grade-submissions/courses/${courseId}/all-submissions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!submissionsResponse.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const submissionsData = await submissionsResponse.json();
      console.log('📊 Submissions Data:', submissionsData);

      // Fetch students with group information for grade sheet
      const studentsResponse = await fetch(
        `${API_BASE_URL}/api/professor/course/${courseId}/grade-sheet-students`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!studentsResponse.ok) {
        throw new Error('Failed to fetch students');
      }

      const studentsData = await studentsResponse.json();
      console.log('👥 Grade Sheet Students Data:', studentsData);
      console.log('👥 Sample student:', studentsData[0]);

      // Build complete project/phase structure from projectsData
      const projectsMap = {};

      console.log('Projects to process:', projectsData.length);
      
      // First, add ALL projects and their phases from the course
      projectsData.forEach(project => {
        console.log('Processing project:', project.title, 'Has project_phases:', project.project_phases?.length);
        
        projectsMap[project.id] = {
          id: project.id,
          title: project.title,
          phases: {},
          hasFinalSubmission: true, // Always show project submission column
          finalMaxGrade: 100
        };

        // Add all phases for this project (backend returns as project_phases)
        if (project.project_phases && Array.isArray(project.project_phases)) {
          project.project_phases.forEach(phase => {
            console.log('Adding phase:', phase.phase_number, phase.title);
            projectsMap[project.id].phases[phase.id] = {
              id: phase.id,
              number: phase.phase_number,
              title: phase.title,
              maxGrade: 100
            };
          });
        }
      });
      
      console.log('ProjectsMap created:', Object.keys(projectsMap).length, 'projects');

      // Then, update max grades from submissions if they exist
      (submissionsData.phaseSubmissions || []).forEach(sub => {
        if (projectsMap[sub.projectId] && projectsMap[sub.projectId].phases[sub.phaseId]) {
          projectsMap[sub.projectId].phases[sub.phaseId].maxGrade = sub.maxGrade || 100;
        }
      });

      (submissionsData.projectSubmissions || []).forEach(sub => {
        if (projectsMap[sub.projectId]) {
          projectsMap[sub.projectId].finalMaxGrade = sub.maxGrade || 100;
        }
      });

      // Build student data with grades
      const studentsArray = studentsData.map(student => {
        const studentGrades = {};
        
        // Get student ID correctly
        const studentId = student.student_id || student.id;

        // Find all submissions for this student's group
        const studentGroupId = student.group_id;

        if (studentGroupId) {
          // Get phase grades
          (submissionsData.phaseSubmissions || []).forEach(sub => {
            if (sub.groupId === studentGroupId) {
              const gradeKey = `phase-${sub.phaseId}`;
              
              // Get individual grade from member_tasks array
              const memberTasks = Array.isArray(sub.memberTasks) ? sub.memberTasks : [];
              const memberData = memberTasks.find(m => m.member_id === studentId);
              
              // Individual grade is stored in member_tasks after grading
              // If exists, use it; otherwise fall back to group grade (for backwards compatibility)
              let individualGrade = null;
              if (memberData && memberData.individual_grade !== undefined && memberData.individual_grade !== null) {
                individualGrade = memberData.individual_grade;
              } else if (sub.grade !== undefined && sub.grade !== null) {
                individualGrade = sub.grade;
              }
              
              // Only create grade entry if grade exists (including 0 as a valid grade)
              if (individualGrade !== null && individualGrade !== undefined && !isNaN(individualGrade)) {
                // Convert to number if it's a string
                const gradeNum = typeof individualGrade === 'string' ? parseFloat(individualGrade) : individualGrade;
                const maxGradeNum = typeof sub.maxGrade === 'string' ? parseFloat(sub.maxGrade) : (sub.maxGrade || 100);
                
                // Get group grade from sub.grade (the "grade" column)
                // BUT: Compare with individual grade first
                // If they're the same, use group grade; if different, use individual grade for both
                let groupGrade = null;
                if (sub.grade !== undefined && sub.grade !== null) {
                  const groupGradeValue = typeof sub.grade === 'string' ? parseFloat(sub.grade) : sub.grade;
                  // Compare: if group grade equals individual grade, keep group grade; otherwise use individual grade
                  groupGrade = (groupGradeValue === gradeNum) ? groupGradeValue : gradeNum;
                }
                
                studentGrades[gradeKey] = {
                  grade: gradeNum,
                  groupGrade: groupGrade,
                  maxGrade: maxGradeNum,
                  status: sub.status,
                  gradedAt: sub.gradedAt,
                  hasCustomGrade: memberData && memberData.individual_grade !== undefined && 
                    memberData.individual_grade !== null && 
                    parseFloat(memberData.individual_grade) !== parseFloat(sub.grade || 0)
                };
              }
            }
          });

          // Get project grades
          (submissionsData.projectSubmissions || []).forEach(sub => {
            if (sub.groupId === studentGroupId) {
              const gradeKey = `project-${sub.projectId}`;
              
              // Get individual grade from member_tasks array
              const memberTasks = Array.isArray(sub.memberTasks) ? sub.memberTasks : [];
              const memberData = memberTasks.find(m => m.member_id === studentId);
              
              // Individual grade is stored in member_tasks after grading
              // If exists, use it; otherwise fall back to group grade (for backwards compatibility)
              let individualGrade = null;
              if (memberData && memberData.individual_grade !== undefined && memberData.individual_grade !== null) {
                individualGrade = memberData.individual_grade;
              } else if (sub.grade !== undefined && sub.grade !== null) {
                individualGrade = sub.grade;
              }
              
              // Only create grade entry if grade exists (including 0 as a valid grade)
              if (individualGrade !== null && individualGrade !== undefined && !isNaN(individualGrade)) {
                // Convert to number if it's a string
                const gradeNum = typeof individualGrade === 'string' ? parseFloat(individualGrade) : individualGrade;
                const maxGradeNum = typeof sub.maxGrade === 'string' ? parseFloat(sub.maxGrade) : (sub.maxGrade || 100);
                
                // Get group grade from sub.grade (the "grade" column)
                // BUT: Compare with individual grade first
                // If they're the same, use group grade; if different, use individual grade for both
                let groupGrade = null;
                if (sub.grade !== undefined && sub.grade !== null) {
                  const groupGradeValue = typeof sub.grade === 'string' ? parseFloat(sub.grade) : sub.grade;
                  // Compare: if group grade equals individual grade, keep group grade; otherwise use individual grade
                  groupGrade = (groupGradeValue === gradeNum) ? groupGradeValue : gradeNum;
                }
                
                studentGrades[gradeKey] = {
                  grade: gradeNum,
                  groupGrade: groupGrade,
                  maxGrade: maxGradeNum,
                  status: sub.status,
                  gradedAt: sub.gradedAt,
                  hasCustomGrade: memberData && memberData.individual_grade !== undefined && 
                    memberData.individual_grade !== null && 
                    parseFloat(memberData.individual_grade) !== parseFloat(sub.grade || 0)
                };
              }
            }
          });
        }

        return {
          id: student.student_id,
          firstName: student.student_first_name,
          lastName: student.student_last_name,
          fullName: `${student.student_first_name} ${student.student_last_name}`.trim(),
          studentNumber: student.student_number,
          email: student.student_email,
          profileImage: student.student_profile_image_url,
          group: student.group_id ? {
            id: student.group_id,
            name: student.group_name,
            number: student.group_number,
            role: student.member_role,
            position: student.position
          } : null,
          grades: studentGrades
        };
      });

      // Sort students by group, then by role (leader first), then by name
      studentsArray.sort((a, b) => {
        // First sort by group
        if (!a.group && !b.group) return a.fullName.localeCompare(b.fullName);
        if (!a.group) return 1;
        if (!b.group) return -1;
        
        const groupCompare = a.group.name.localeCompare(b.group.name);
        if (groupCompare !== 0) return groupCompare;
        
        // Then by role (leader first)
        if (a.group.role === 'leader' && b.group.role !== 'leader') return -1;
        if (a.group.role !== 'leader' && b.group.role === 'leader') return 1;
        
        // Then by name
        return a.fullName.localeCompare(b.fullName);
      });

      setGradeSheetData({
        loading: false,
        projects: Object.values(projectsMap),
        students: studentsArray
      });
    } catch (error) {
      console.error('Error fetching grade sheet data:', error);
      setGradeSheetData(prev => ({ ...prev, loading: false }));
    }
  };

  // Export grade sheet to Excel
  const exportGradeSheet = () => {
    try {
      // Create worksheet data
      const wsData = [];
      
      // Build header row
      const headerRow = ['Student Number', 'Name', 'Email', 'Group', 'Position'];
      
      // Add project and phase columns
      gradeSheetData.projects.forEach((project, projectIndex) => {
        // Add project submission columns
        if (project.hasFinalSubmission) {
          headerRow.push(`(P-${projectIndex + 1}) ${project.title} - GRP Grade`);
          headerRow.push(`(P-${projectIndex + 1}) ${project.title} - IND Grade`);
        }
        // Add phase columns
        const phases = Object.values(project.phases).sort((a, b) => a.number - b.number);
        phases.forEach(phase => {
          headerRow.push(`(P-${projectIndex + 1} Ph.${phase.number}) ${phase.name || `Phase ${phase.number}`} - GRP Grade`);
          headerRow.push(`(P-${projectIndex + 1} Ph.${phase.number}) ${phase.name || `Phase ${phase.number}`} - IND Grade`);
        });
      });
      
      wsData.push(headerRow);
      
      // Add student data rows
      gradeSheetData.students.forEach(student => {
        const row = [
          student.studentNumber,
          student.fullName,
          student.email,
          student.group?.name || 'No Group',
          student.group?.role || '-'
        ];
        
        // Add grades for each project and phase
        gradeSheetData.projects.forEach(project => {
          // Add project submission grade
          if (project.hasFinalSubmission) {
            const gradeKey = `project-${project.id}`;
            const gradeData = student.grades[gradeKey];
            // Group grade (placeholder for now)
            row.push('-');
            // Individual grade
            if (gradeData) {
              const gradeText = gradeData.grade !== null 
                ? `${gradeData.grade}/${gradeData.maxGrade}${gradeData.hasCustomGrade ? ' (Custom)' : ''}` 
                : '-';
              row.push(gradeText);
            } else {
              row.push('-');
            }
          }
          
          // Add phase grades
          const phases = Object.values(project.phases).sort((a, b) => a.number - b.number);
          phases.forEach(phase => {
            const gradeKey = `phase-${phase.id}`;
            const gradeData = student.grades[gradeKey];
            // Group grade (placeholder for now)
            row.push('-');
            // Individual grade
            if (gradeData) {
              const gradeText = gradeData.grade !== null 
                ? `${gradeData.grade}/${gradeData.maxGrade}${gradeData.hasCustomGrade ? ' (Custom)' : ''}` 
                : '-';
              row.push(gradeText);
            } else {
              row.push('-');
            }
          });
        });
        
        wsData.push(row);
      });
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Student Number
        { wch: 25 }, // Name
        { wch: 30 }, // Email
        { wch: 15 }, // Group
        { wch: 15 }  // Position
      ];
      
      // Add width for each grade column
      gradeSheetData.projects.forEach(project => {
        if (project.hasFinalSubmission) {
          colWidths.push({ wch: 20 }); // GRP Grade
          colWidths.push({ wch: 20 }); // IND Grade
        }
        const phases = Object.values(project.phases);
        phases.forEach(() => {
          colWidths.push({ wch: 20 }); // GRP Grade
          colWidths.push({ wch: 20 }); // IND Grade
        });
      });
      
      ws['!cols'] = colWidths;
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Grade Sheet');
      
      // Generate filename with course code and date
      const date = new Date().toISOString().split('T')[0];
      const filename = `${course?.code || 'Course'}_Grade_Sheet_${date}.xlsx`;
      
      // Save file
      XLSX.writeFile(wb, filename);
      
      alert('Grade sheet exported successfully!');
    } catch (error) {
      console.error('Error exporting grade sheet:', error);
      alert('Failed to export grade sheet. Please try again.');
    }
  };

  // =================== GANTT CHART HELPER FUNCTIONS FOR REPORTS MODAL ===================
  
  const getGanttDateRange = () => {
    if (!reportsModalProject) return { start: null, end: null };
    
    const phases = reportsModalProject.project_phases || [];
    if (phases.length === 0) return { start: null, end: null };
    
    // If a specific phase is selected in the modal, use that phase's dates
    if (reportsModalPhase) {
      return {
        start: new Date(reportsModalPhase.start_date),
        end: new Date(reportsModalPhase.end_date)
      };
    }
    
    // Otherwise use the full project timeline
    const startDates = phases.map(p => new Date(p.start_date)).filter(d => !isNaN(d));
    const endDates = phases.map(p => new Date(p.end_date)).filter(d => !isNaN(d));
    
    if (startDates.length === 0 || endDates.length === 0) {
      return { start: null, end: null };
    }
    
    return {
      start: new Date(Math.min(...startDates)),
      end: new Date(Math.max(...endDates))
    };
  };

  const getGanttTimelineDays = () => {
    const { start, end } = getGanttDateRange();
    if (!start || !end) return [];
    
    const days = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    
    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const getAdaptiveDayWidth = (containerWidth = null) => {
    const timelineDays = getGanttTimelineDays();
    const dayCount = timelineDays.length;
    
    if (dayCount === 0) return 100;
    
    const effectiveWidth = containerWidth || ganttContainerWidth || 800;
    const availableWidth = effectiveWidth - nameColumnWidth - 40;
    
    if (dayCount <= 7) return Math.max(120, availableWidth / dayCount);
    if (dayCount <= 14) return Math.max(90, availableWidth / dayCount);
    if (dayCount <= 30) return Math.max(70, availableWidth / dayCount);
    if (dayCount <= 60) return Math.max(50, availableWidth / dayCount);
    if (dayCount <= 90) return Math.max(40, availableWidth / dayCount);
    return Math.max(30, availableWidth / dayCount);
  };

  const calculatePhaseRows = (phases, dayWidth) => {
    if (!phases || phases.length === 0) return [];
    
    const sortedPhases = [...phases].sort((a, b) => a.startDay - b.startDay);
    const rows = [];
    
    sortedPhases.forEach(phase => {
      let rowIndex = 0;
      let placed = false;
      
      while (!placed) {
        if (!rows[rowIndex]) {
          rows[rowIndex] = [];
        }
        
        const overlaps = rows[rowIndex].some(existingPhase => {
          const phaseEnd = phase.startDay + phase.duration;
          const existingEnd = existingPhase.startDay + existingPhase.duration;
          return !(phaseEnd <= existingPhase.startDay || phase.startDay >= existingEnd);
        });
        
        if (!overlaps) {
          rows[rowIndex].push({ ...phase, row: rowIndex });
          placed = true;
        } else {
          rowIndex++;
        }
      }
    });
    
    return rows.flat();
  };

  const getTaskPosition = (task, dayWidth) => {
    const { start } = getGanttDateRange();
    if (!start || !task.start_date || !task.due_date) {
      return { startDate: new Date(), endDate: new Date(), leftPos: 0, width: dayWidth };
    }
    
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.due_date);
    taskStart.setHours(0, 0, 0, 0);
    taskEnd.setHours(0, 0, 0, 0);
    
    const timelineStart = new Date(start);
    timelineStart.setHours(0, 0, 0, 0);
    
    const startOffset = Math.floor((taskStart - timelineStart) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((taskEnd - taskStart) / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      startDate: taskStart,
      endDate: taskEnd,
      leftPos: startOffset * dayWidth,
      width: duration * dayWidth
    };
  };

  useEffect(() => {
    if (gradingProject) {
      fetchSubmissions(gradingProject.id);
    }
  }, [gradingProject]);

  // Initialize grade and feedback when a submission is selected
  useEffect(() => {
    const selectedSubmission = gradeSubmissionsView.selectedSubmission;
    if (selectedSubmission) {
      // Set group grade from submission
      setGroupGrade(selectedSubmission.grade || 0);
      // Set feedback from submission
      setFeedback(selectedSubmission.instructor_feedback || selectedSubmission.feedback || '');
      
      // Initialize toggle states for custom individual grades
      const newExpandedFields = {};
      const memberTasks = selectedSubmission.memberTasks || [];
      
      memberTasks.forEach(member => {
        const memberId = member.member_id;
        // Check if member has a custom individual grade (different from group grade)
        if (member.individual_grade !== undefined && member.individual_grade !== null) {
          const hasCustomGrade = member.individual_grade !== selectedSubmission.grade;
          if (hasCustomGrade) {
            newExpandedFields[`grade-${memberId}`] = true;
          }
        }
      });
      
      setExpandedReasonFields(newExpandedFields);
    }
  }, [gradeSubmissionsView.selectedSubmission]);

  // Fetch professor profile on mount
  useEffect(() => {
    const fetchProfessorProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/api/professor/profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          setProfessorProfile(data);
        }
      } catch (error) {
        console.error('Error fetching professor profile:', error);
      }
    };

    fetchProfessorProfile();
  }, []);

  // Fetch announcements
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const response = await fetch(`/api/announcements/course/${course?.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setAnnouncements(data);
        }
      } catch (error) {
        console.error('Error fetching announcements:', error);
      }
    };

    if (course?.id) {
      fetchAnnouncements();
    }
  }, [course?.id]);

  // Computed states
  const activeProjects = projects.filter(p => {
    const now = new Date();
    const dueDate = new Date(p.due_date);
    return dueDate >= now;
  });

  const unassignedStudents = students.filter(student => 
    !groups.some(group => 
      group.members && group.members.some(member => member.id === student.id)
    )
  );

  const pendingJoinRequests = joinRequests.filter(request => request.status === 'pending');

  // Fetch all grade submissions for the current course
  const fetchAllGradeSubmissions = useCallback(async () => {
    setGradeSubmissionsView(prev => ({
      ...prev,
      loading: true
    }));

    try {
      const token = localStorage.getItem('token');
      
      const submissionsResponse = await fetch(
        `${apiConfig.baseURL}/api/grade-submissions/courses/${courseId}/all-submissions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!submissionsResponse.ok) {
        throw new Error('Failed to load submissions');
      }
      
      const data = await submissionsResponse.json();
      
      console.log('🔍 Fetched all submissions data:', data);
      
      // Transform the data to match the expected format
      const phaseSubmissionsFormatted = (data.phaseSubmissions || []).map(sub => ({
        id: sub.id,
        taskId: sub.id,
        latestStatus: sub.status || 'pending',
        submissionType: 'phase',
        type: 'phase',
        projectId: sub.projectId,
        phaseId: sub.phaseId,
        phaseNumber: sub.phaseNumber,
        phaseTitle: sub.phaseTitle,
        phaseName: sub.phaseTitle || sub.phaseName || '',
        groupId: sub.groupId,
        groupName: sub.groupName,
        grade: sub.grade,
        maxGrade: sub.maxGrade,
        gradedAt: sub.gradedAt,
        gradedBy: sub.gradedBy,
        instructor_feedback: sub.instructorFeedback,
        feedback: sub.instructorFeedback,
        memberTasks: sub.memberTasks,
        evaluationSubmissions: sub.evaluationSubmissions,
        memberInclusions: sub.memberInclusions,
        validationResults: sub.validationResults,
        phaseSnapshot: sub.phaseSnapshot,
        rubricData: sub.rubricData,
        files: sub.files,
        fileUrls: sub.files,
        is_resubmission: sub.isResubmission,
        resubmission_number: sub.resubmissionNumber,
        original_submission_id: sub.originalSubmissionId,
        submitted_at: sub.submittedAt,
        attempts: [{
          submissionId: sub.id,
          taskId: sub.id,
          memberName: sub.groupName || 'Unknown Group',
          memberProfileImage: sub.submittedBy?.profileImage,
          submittedAt: sub.submittedAt,
          status: sub.status || 'pending',
          submissionText: sub.submissionText,
          fileUrls: sub.files,
          submittedBy: sub.submittedBy
        }]
      }));

      const projectSubmissionsFormatted = (data.projectSubmissions || []).map(sub => ({
        id: sub.id,
        taskId: sub.id,
        latestStatus: sub.status || 'pending',
        submissionType: 'project',
        type: 'project',
        projectId: sub.projectId,
        groupId: sub.groupId,
        groupName: sub.groupName,
        grade: sub.grade,
        maxGrade: sub.maxGrade,
        gradedAt: sub.gradedAt,
        gradedBy: sub.gradedBy,
        instructor_feedback: sub.instructorFeedback,
        feedback: sub.instructorFeedback,
        memberTasks: sub.memberTasks,
        evaluationSubmissions: sub.evaluationSubmissions,
        memberInclusions: sub.memberInclusions,
        validationResults: sub.validationResults,
        projectSnapshot: sub.projectSnapshot,
        rubricData: sub.rubricData,
        phaseDeliverables: sub.phaseDeliverables,
        files: sub.files,
        fileUrls: sub.files,
        is_resubmission: sub.isResubmission,
        resubmission_number: sub.resubmissionNumber,
        original_submission_id: sub.originalSubmissionId,
        submitted_at: sub.submittedAt,
        attempts: [{
          submissionId: sub.id,
          taskId: sub.id,
          memberName: sub.groupName || 'Unknown Group',
          memberProfileImage: sub.submittedBy?.profileImage,
          submittedAt: sub.submittedAt,
          status: sub.status || 'pending',
          submissionText: sub.submissionText,
          fileUrls: sub.files,
          submittedBy: sub.submittedBy
        }]
      }));

      const allSubmissions = [...phaseSubmissionsFormatted, ...projectSubmissionsFormatted];
      
      console.log('✅ Total submissions loaded:', allSubmissions.length);
      console.log('📊 Phase submissions:', phaseSubmissionsFormatted.length);
      console.log('📊 Project submissions:', projectSubmissionsFormatted.length);
      
      setGradeSubmissionsView(prev => ({
        ...prev,
        detailsData: allSubmissions,
        loading: false
      }));
    } catch (error) {
      console.error('Error loading all submissions:', error);
      setGradeSubmissionsView(prev => ({
        ...prev,
        loading: false
      }));
    }
  }, [courseId]);

  const fetchCourseData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      const token = localStorage.getItem('token');
      
      const coursesResponse = await fetch(`${API_BASE_URL}/api/professor/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (coursesResponse.ok) {
        const courses = await coursesResponse.json();
        const selectedCourse = courses.find(c => c.id === courseId);
        
        if (selectedCourse) {
          setCourse(selectedCourse);
          setLastUpdated(new Date());
          
          // Fetch students with images
          const studentsResponse = await fetch(`${API_BASE_URL}/api/professor/course/${courseId}/students-with-images`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (studentsResponse.ok) {
            const studentsData = await studentsResponse.json();
            console.log('👥 Students data received:', studentsData);
            console.log('👥 First student sample:', studentsData[0]);
            setStudents(studentsData);
          } else {
            console.error('Failed to fetch students:', studentsResponse.status, studentsResponse.statusText);
          }

          await Promise.all([
            fetchGroups(false),
            fetchProjects(false),
            fetchJoinRequests(false),
            fetchRecentSubmissions(false),
            fetchSubmissionActivity(false),
            fetchTaskAndRevisionSubmissions(),
            fetchDashboardSubmissions()
          ]);
        } else {
          setError('Course not found');
        }
      }
    } catch (error) {
      console.error('Error fetching course data:', error);
      setError('Failed to load course data');
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: 'Failed to refresh course data',
        timestamp: new Date()
      }]);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [courseId]);

  // Fetch course analytics data
  const fetchAnalyticsData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiConfig.baseURL}/api/professor/course/${courseId}/analytics`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalyticsData(data);
        console.log('📊 Analytics data loaded:', data.summary);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
    }
  }, [courseId]);

  useEffect(() => {
    fetchCourseData();
    fetchAnalyticsData();
  }, [courseId, fetchAnalyticsData]);

  // Fetch grade sheet data when tab changes to grade-sheet
  useEffect(() => {
    if (activeTab === 'grade-sheet') {
      fetchGradeSheetData();
    }
  }, [activeTab]);

  // Fetch all grade submissions when tab changes to grade-submissions
  useEffect(() => {
    if (activeTab === 'grade-submissions') {
      console.log('🔄 Grade submissions tab activated, fetching data...');
      fetchAllGradeSubmissions();
    }
  }, [activeTab, fetchAllGradeSubmissions]);

  // Fetch member profile images when submission is selected
  useEffect(() => {
    if (!gradeSubmissionsView.selectedSubmission) {
      setMemberProfileImages({});
      return;
    }

    const fetchMemberImages = async () => {
      const submission = gradeSubmissionsView.selectedSubmission;
      const memberIds = new Set(); // Use Set to avoid duplicates
      
      console.log('📸 Fetching member images for submission:', submission);
      console.log('📸 submission.memberTasks:', submission.memberTasks);
      console.log('📸 submission.memberInclusions:', submission.memberInclusions);
      
      // Helper function to extract ID from various possible field names
      const extractMemberId = (member) => {
        return member.member_id || member.memberId || member.student_id || member.studentId || member.id;
      };
      
      // Get member IDs from memberTasks
      if (submission.memberTasks && Array.isArray(submission.memberTasks)) {
        submission.memberTasks.forEach(member => {
          const memberId = extractMemberId(member);
          if (memberId) {
            memberIds.add(memberId);
            console.log('📸 Found member ID from memberTasks:', memberId, 'Member data:', member);
          }
        });
      }
      
      // Also get member IDs from memberInclusions
      if (submission.memberInclusions && Array.isArray(submission.memberInclusions)) {
        submission.memberInclusions.forEach(member => {
          const memberId = extractMemberId(member);
          if (memberId) {
            memberIds.add(memberId);
            console.log('📸 Found member ID from memberInclusions:', memberId, 'Member data:', member);
          }
        });
      }

      const memberIdsArray = Array.from(memberIds);
      console.log('📸 All member IDs to fetch:', memberIdsArray);

      if (memberIdsArray.length === 0) {
        console.warn('📸 No member IDs found to fetch profile images');
        return;
      }

      // Fetch profile images for all members from backend
      const profileImages = {};
      try {
        const token = localStorage.getItem('token');
        const fetchUrl = `${apiConfig.baseURL}/api/professor/students/profile-images?ids=${memberIdsArray.join(',')}`;
        console.log('📸 Fetching profile images from URL:', fetchUrl);
        
        // Fetch all student profiles in one request
        const response = await fetch(fetchUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📸 Profile images response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('📸 Profile images fetched:', data);
          // data should be an array of {id, profile_image_url}
          if (Array.isArray(data)) {
            data.forEach(student => {
              if (student.id && student.profile_image_url) {
                profileImages[student.id] = student.profile_image_url;
                console.log(`📸 Cached image for member ${student.id}: ${student.profile_image_url}`);
              }
            });
          }
        } else {
          const errorText = await response.text();
          console.warn('Failed to fetch profile images from backend', response.status, errorText);
        }
      } catch (err) {
        console.error('❌ Error fetching profile images:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          apiConfigBaseURL: apiConfig?.baseURL
        });
      }
      
      console.log('📸 Final profileImages state:', profileImages);
      setMemberProfileImages(profileImages);
    };

    fetchMemberImages();
  }, [gradeSubmissionsView.selectedSubmission]);

  const fetchGroups = async (showNotification = true) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/professor/course/${courseId}/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const groupsData = await response.json();
        const previousCount = groups.length;
        setGroups(groupsData);
        
        if (showNotification && groupsData.length > previousCount) {
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'success',
            message: `${groupsData.length - previousCount} new group(s) created!`,
            timestamp: new Date()
          }]);
        }
      } else {
        console.error('Failed to fetch groups');
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
  };

  const fetchProjects = async (showNotification = true) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/professor/course/${courseId}/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const projectsData = await response.json();
        const previousCount = projects.length;
        setProjects(projectsData);
        
        if (showNotification && projectsData.length > previousCount) {
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'success',
            message: `${projectsData.length - previousCount} new project(s) created!`,
            timestamp: new Date()
          }]);
        }
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const fetchSubmissions = async (projectId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/professor/projects/${projectId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };
  
  // Fetch all phase and project deliverable submissions for grading
  const fetchAllSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('❌ No authentication token found');
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          message: 'Authentication required. Please log in again.',
          timestamp: new Date()
        }]);
        return;
      }
      
      // Fetch all phase deliverable submissions for this course
      const phaseResponse = await fetch(
        `${API_BASE_URL}/api/professor/courses/${courseId}/phase-deliverable-submissions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Fetch all project deliverable submissions for this course
      const projectResponse = await fetch(
        `${API_BASE_URL}/api/professor/courses/${courseId}/project-deliverable-submissions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Handle phase submissions response
      if (phaseResponse.ok) {
        const phaseData = await phaseResponse.json();
        setPhaseSubmissions(phaseData.submissions || phaseData || []);
        console.log('✅ Loaded', (phaseData.submissions || phaseData || []).length, 'phase submissions');
      } else if (phaseResponse.status === 403) {
        const errorData = await phaseResponse.json().catch(() => ({ error: 'Access denied' }));
        console.error('❌ 403 Error - Phase submissions:', errorData.error);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          message: `Access denied: ${errorData.error}. You may not be the owner of this course.`,
          timestamp: new Date()
        }]);
        setPhaseSubmissions([]);
      } else {
        const errorData = await phaseResponse.json().catch(() => ({ error: 'Failed to load' }));
        console.error('❌ Error loading phase submissions:', errorData.error);
        setPhaseSubmissions([]);
      }
      
      // Handle project submissions response
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProjectSubmissions(projectData.submissions || projectData || []);
        console.log('✅ Loaded', (projectData.submissions || projectData || []).length, 'project submissions');
      } else if (projectResponse.status === 403) {
        const errorData = await projectResponse.json().catch(() => ({ error: 'Access denied' }));
        console.error('❌ 403 Error - Project submissions:', errorData.error);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          message: `Access denied: ${errorData.error}. You may not be the owner of this course.`,
          timestamp: new Date()
        }]);
        setProjectSubmissions([]);
      } else {
        const errorData = await projectResponse.json().catch(() => ({ error: 'Failed to load' }));
        console.error('❌ Error loading project submissions:', errorData.error);
        setProjectSubmissions([]);
      }
    } catch (error) {
      console.error('Error fetching submissions for grading:', error);
      setNotifications(prev => [...prev, {
        id: Date.now(),
        type: 'error',
        message: 'Failed to load submissions: ' + error.message,
        timestamp: new Date()
      }]);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const fetchJoinRequests = async (showNotification = true) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/professor/course/${courseId}/join-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const joinRequestsData = await response.json();
        setJoinRequests(joinRequestsData);
      }
    } catch (error) {
      console.error('Error fetching join requests:', error);
      setJoinRequests([]); // Set empty array if endpoint doesn't exist
    }
  };

  const fetchRecentSubmissions = async (showNotification = true) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/professor/course/${courseId}/recent-submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const submissionsData = await response.json();
        setRecentSubmissions(submissionsData);
      }
    } catch (error) {
      console.error('Error fetching recent submissions:', error);
      setRecentSubmissions([]); // Set empty array if endpoint doesn't exist
    }
  };

  const fetchSubmissionActivity = async (showNotification = true) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/api/professor/course/${courseId}/submission-activity`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const activityData = await response.json();
        setSubmissionActivity(activityData);
      } else {
        // Generate mock data for the last 7 days if endpoint doesn't exist
        const mockData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          mockData.push({
            date: date.toLocaleDateString('en-US', { weekday: 'short' }),
            count: Math.floor(Math.random() * 10)
          });
        }
        setSubmissionActivity(mockData);
      }
    } catch (error) {
      console.error('Error fetching submission activity:', error);
      // Generate mock data for the last 7 days
      const mockData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        mockData.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short' }),
          count: Math.floor(Math.random() * 10)
        });
      }
      setSubmissionActivity(mockData);
    }
  };

  const fetchTaskAndRevisionSubmissions = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔄 Fetching task and revision submissions for courseId:', courseId);
      
      // Fetch task submissions
      const taskResponse = await fetch(`${API_BASE_URL}/api/professor/course/${courseId}/task-submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (taskResponse.ok) {
        const taskData = await taskResponse.json();
        console.log('✅ Task submissions fetched:', taskData);
        setTaskSubmissions(taskData);
      } else {
        console.warn('⚠️ Task submissions response not ok:', taskResponse.status);
        setTaskSubmissions([]);
      }

      // Fetch revision submissions
      const revisionResponse = await fetch(`${API_BASE_URL}/api/professor/course/${courseId}/revision-submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (revisionResponse.ok) {
        const revisionData = await revisionResponse.json();
        console.log('✅ Revision submissions fetched:', revisionData);
        setRevisionSubmissions(revisionData);
      } else {
        console.warn('⚠️ Revision submissions response not ok:', revisionResponse.status);
        setRevisionSubmissions([]);
      }
    } catch (error) {
      console.error('❌ Error fetching task and revision submissions:', error);
      setTaskSubmissions([]);
      setRevisionSubmissions([]);
    }
  };

  const fetchDashboardSubmissions = async (retryCount = 0, maxRetries = 3) => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔄 Fetching dashboard submissions for courseId:', courseId);
      
      // First test if auth works
      try {
        const testResponse = await fetch(
          `${API_BASE_URL}/api/professor/test-auth`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        console.log('🧪 Auth test response:', testResponse.status, testResponse.statusText);
        if (!testResponse.ok) {
          console.error('❌ Auth test failed:', testResponse.status);
        }
      } catch (testError) {
        console.error('❌ Auth test error:', testError.message);
      }
      
      // Fetch all phase deliverable submissions for this course
      const phaseResponse = await fetch(
        `${API_BASE_URL}/api/professor/courses/${courseId}/phase-deliverable-submissions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Fetch all project deliverable submissions for this course
      const projectResponse = await fetch(
        `${API_BASE_URL}/api/professor/courses/${courseId}/project-deliverable-submissions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // If we get 403, retry with exponential backoff (auth may not be fully initialized)
      if ((phaseResponse.status === 403 || projectResponse.status === 403) && retryCount < maxRetries) {
        const delayMs = 500 * Math.pow(2, retryCount);
        console.warn(`⚠️ Got 403 Forbidden. Retrying in ${delayMs}ms... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return fetchDashboardSubmissions(retryCount + 1, maxRetries);
      }
      
      let phaseData = [];
      let projectData = [];

      if (phaseResponse.ok) {
        const data = await phaseResponse.json();
        // Data comes directly as array, not wrapped in object
        phaseData = Array.isArray(data) ? data : (data.submissions || []);
        console.log('✅ Phase submissions fetched:', phaseData, 'count:', phaseData.length);
      } else {
        console.warn('⚠️ Phase submissions response not ok:', phaseResponse.status, phaseResponse.statusText);
      }
      
      if (projectResponse.ok) {
        const data = await projectResponse.json();
        // Data comes directly as array, not wrapped in object
        projectData = Array.isArray(data) ? data : (data.submissions || []);
        console.log('✅ Project submissions fetched:', projectData, 'count:', projectData.length);
      } else {
        console.warn('⚠️ Project submissions response not ok:', projectResponse.status, projectResponse.statusText);
      }

      // Set the submissions state with both phase and project submissions for the graphs
      setSubmissions({
        phaseSubmissions: phaseData,
        projectSubmissions: projectData
      });
      console.log('✅ Submissions state updated with', phaseData.length + projectData.length, 'total submissions');
    } catch (error) {
      console.error('❌ Error fetching dashboard submissions:', error);
      setSubmissions({ phaseSubmissions: [], projectSubmissions: [] });
    }
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelectedProjectForGrading(null);
    
    // Fetch submissions when switching to grading tab
    if (tabId === 'grading') {
      fetchAllSubmissions();
    }
  };

  const handleProjectGrading = (project) => {
    setSelectedProjectForGrading(project);
    setGradingProject(project);
    setActiveTab('grading');
  };

  const handleEditProject = async (project) => {
    // Fetch detailed project data with phases
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiConfig.baseURL}/api/professor/projects/${project.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const detailedProjectData = await response.json();
        setEditingProject(detailedProjectData);
        setShowEditProjectModal(true);
      } else {
        console.error('Failed to fetch detailed project data');
        setEditingProject(project);
        setShowEditProjectModal(true);
      }
    } catch (error) {
      console.error('Error fetching detailed project:', error);
      setEditingProject(project);
      setShowEditProjectModal(true);
    }
  };

  const handleCloseEditProjectModal = () => {
    setShowEditProjectModal(false);
    setEditingProject(null);
  };

  const handleUpdateProject = async (projectData) => {
    try {
      const response = await fetch(`${apiConfig.baseURL}/api/professor/projects/${editingProject.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(projectData)
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error && result.message) {
          setWarningMessage(result.message);
          setShowWarningModal(true);
          return;
        }
        throw new Error(result.error || 'Failed to update project');
      }

      // Refresh projects data
      await fetchProjects();
      handleCloseEditProjectModal();
    } catch (error) {
      console.error('Error updating project:', error);
      setWarningMessage('Failed to update project. Please try again.');
      setShowWarningModal(true);
    }
  };

  const handleUpdatePhase = async (phaseId, phaseData) => {
    try {
      const response = await fetch(`${apiConfig.baseURL}/api/professor/phases/${phaseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(phaseData)
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error && result.message) {
          setWarningMessage(result.message);
          setShowWarningModal(true);
          return;
        }
        throw new Error(result.error || 'Failed to update phase');
      }

      // Refresh projects data
      await fetchProjects();
    } catch (error) {
      console.error('Error updating phase:', error);
      setWarningMessage('Failed to update phase. Please try again.');
      setShowWarningModal(true);
    }
  };

  const handleViewSubmissions = (project) => {
    // TODO: Implement view submissions functionality
    console.log('View submissions for project:', project);
    // You can implement a modal or navigate to submissions page
  };

  const handleDuplicateProject = (project) => {
    // TODO: Implement duplicate project functionality
    console.log('Duplicate project:', project);
    // You can implement a modal to create a copy of the project
  };

  const handleDeleteProject = async (project) => {
    try {
      // Show confirmation modal
      setWarningMessage(`Are you sure you want to delete "${project.title}"? This action cannot be undone and will delete all associated data including phases, tasks, rubrics, and evaluation forms.`);
      setShowWarningModal(true);
      
      // Store the project to delete for the confirmation
      setProjectToDelete(project);
    } catch (error) {
      console.error('Error preparing delete project:', error);
      setWarningMessage('Failed to prepare project deletion. Please try again.');
      setShowWarningModal(true);
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    try {
      const response = await fetch(`${apiConfig.baseURL}/api/professor/course/${courseId}/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error && result.message) {
          setWarningMessage(result.message);
          setShowWarningModal(true);
          return;
        }
        throw new Error(result.error || 'Failed to delete project');
      }

      // Refresh projects data
      await fetchProjects();
      
      // Show success message
      setWarningMessage(`Project "${projectToDelete.title}" has been deleted successfully.`);
      setShowWarningModal(true);
      
      // Clear the project to delete
      setProjectToDelete(null);
    } catch (error) {
      console.error('Error deleting project:', error);
      setWarningMessage('Failed to delete project. Please try again.');
      setShowWarningModal(true);
    }
  };

  const togglePhaseDropdown = (phaseIndex) => {
    const newExpandedState = !expandedPhases[phaseIndex];
    
    setExpandedPhases(prev => ({
      ...prev,
      [phaseIndex]: newExpandedState
    }));
    
    // Force reflow to ensure proper positioning
    setTimeout(() => {
      const dropdowns = document.querySelectorAll('.phase-dropdown');
      dropdowns.forEach((dropdown, index) => {
        if (index > phaseIndex && newExpandedState) {
          const previousDropdown = dropdowns[phaseIndex];
          const previousContent = previousDropdown?.querySelector('.phase-dropdown-content');
          if (previousContent) {
            const offset = previousContent.offsetHeight + 5; // 5px extra margin
            dropdown.style.transform = `translateY(${offset}px)`;
            dropdown.style.transition = 'transform 0.3s ease';
          }
        } else if (index > phaseIndex && !newExpandedState) {
          dropdown.style.transform = 'translateY(0px)';
        }
      });
    }, 100);
  };

  // Reports Modal State - FULL IMPLEMENTATION
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [reportsModalData, setReportsModalData] = useState(null);
  const [loadingReportsData, setLoadingReportsData] = useState(false);
  const [reportsModalProject, setReportsModalProject] = useState(null);
  const [reportsModalPhase, setReportsModalPhase] = useState(null);
  const [reportsModalGroupData, setReportsModalGroupData] = useState(null);
  const [reportsModalTasks, setReportsModalTasks] = useState([]);
  const [reportsModalAllGroupTasks, setReportsModalAllGroupTasks] = useState([]);
  const [selectedSubmissionStatusFilter, setSelectedSubmissionStatusFilter] = useState(null);
  
  // Reports Modal Gantt Chart States
  const [ganttContainerWidth, setGanttContainerWidth] = useState(null);
  const [nameColumnWidth, setNameColumnWidth] = useState(200);
  const [visiblePhases, setVisiblePhases] = useState(new Set());
  
  // Reports Modal Dropdown States
  const [showReportsProjectDropdown, setShowReportsProjectDropdown] = useState(false);
  const [showReportsGanttPhaseDropdown, setShowReportsGanttPhaseDropdown] = useState(false);
  
  // Reports Modal Refs
  const reportsGanttRef = useRef(null);
  const reportsPieChartRef = useRef(null);
  const reportsTaskTableRef = useRef(null);
  const ganttContainerRef = useRef(null);

  // Notification Component
  const NotificationBanner = ({ notification }) => (
    <div className={`notification ${notification.type}`}>
      <div className="notification-content">
        <FaBell size={16} />
        <span>{notification.message}</span>
        <span className="notification-time">
          {notification.timestamp.toLocaleTimeString()}
        </span>
      </div>
      <button 
        className="notification-close"
        onClick={() => removeNotification(notification.id)}
      >
        ×
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading course...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/professor-dashboard')} className="btn btn-primary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (selectedProjectForGrading && activeTab === 'grading') {
    return (
      <SimplifiedGradingDashboard 
        courseId={courseId}
        projectId={selectedProjectForGrading.id}
        onBack={() => {
          setSelectedProjectForGrading(null);
          setActiveTab('projects');
        }}
      />
    );
  }

  function getPageTitle() {
    switch (activeTab) {
      case 'course-overview': return 'Course Overview';
      case 'students': return 'Students';
      case 'groups': return 'Groups';
      case 'projects': return 'Projects';
      case 'tasks': return 'Tasks Management';
      case 'grading': return 'Grading';
      case 'grade-submissions': return 'Grade Submissions';
      case 'grade-sheet': return 'Grade Sheet';
      case 'announcements': return 'Announcements';
      case 'join-requests': return 'Join Requests';
      case 'analytics': return 'Analytics';
      case 'course-settings': return 'Course Settings';
      case 'bulk-actions': return 'Bulk Actions';
      default: return 'Course Dashboard';
    }
  }

  function renderContent() {
    switch (activeTab) {
      case 'course-overview':
        return renderCourseOverview();
      case 'students':
        return renderStudents();
      case 'groups':
        return renderGroups();
      case 'projects':
        return renderProjects();
      case 'grading':
        if (gradingProject) {
          return renderProjectGrading();
        }
        return renderGrading();
      case 'grade-submissions':
        return renderGradeSubmissions();
      case 'grade-sheet':
        return renderGradeSheet();
      case 'announcements':
        return renderAnnouncements();
      case 'join-requests':
        return renderJoinRequests();
      case 'course-settings':
        return renderCourseSettings();
      default:
        return renderCourseOverview();
    }
  }

  function renderCourseOverview() {
    // DEBUG LOGGING
    console.log('🎯 renderCourseOverview() called');
    console.log('📦 submissions state:', submissions);
    console.log('📦 taskSubmissions state:', taskSubmissions);
    console.log('📦 revisionSubmissions state:', revisionSubmissions);
    
    // Calculate basic stats from available data
    const totalStudents = students.length;
    const totalGroups = groups.length;
    const totalProjects = projects.length;
    const totalAnnouncements = announcements.length;
    const pendingRequests = joinRequests.filter(req => req.status === 'pending').length;
    
    // Calculate project stats
    const activeProjects = projects.filter(p => p.status === 'active').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    const overdueProjects = projects.filter(p => {
      if (!p.due_date) return false;
      return new Date(p.due_date) < new Date() && p.status !== 'completed';
    }).length;

    // Calculate group stats
    const groupsWithMembers = groups.filter(g => g.members && g.members.length > 0).length;
    const emptyGroups = groups.filter(g => !g.members || g.members.length === 0).length;

    // Calculate submissions to grade
    const submissionsToGrade = (submissions?.projectSubmissions?.filter(s => s.status === 'submitted').length || 0) + 
                               (submissions?.phaseSubmissions?.filter(s => s.status === 'submitted').length || 0);

    // Calculate Group Submission Trend Data from phase and project deliverable submissions
    const calculateGroupSubmissionTrend = () => {
      const allSubmissions = [
        ...(submissions?.phaseSubmissions || []),
        ...(submissions?.projectSubmissions || [])
      ];
      console.log('🔍 calculateGroupSubmissionTrend: allSubmissions =', allSubmissions);
      if (allSubmissions.length > 0) {
        console.log('🔍 First submission fields:', Object.keys(allSubmissions[0]));
        console.log('🔍 First submission object:', allSubmissions[0]);
      }

      // Group submissions by month
      const submissionsByMonth = {};
      const now = new Date();
      const monthsBack = submissionTimePeriod; // Use the selected time period (3 or 6 months)
      const startDate = new Date(now.getFullYear(), now.getMonth() - monthsBack, 1);
      
      allSubmissions.forEach((submission, idx) => {
        // Try different field names for the submission date (camelCase and snake_case)
        let submittedDate = null;
        if (submission.submittedAt) {
          submittedDate = new Date(submission.submittedAt);
        } else if (submission.submitted_at) {
          submittedDate = new Date(submission.submitted_at);
        } else if (submission.submission_date) {
          submittedDate = new Date(submission.submission_date);
        } else if (submission.created_at) {
          submittedDate = new Date(submission.created_at);
        }
        
        if (submittedDate && !isNaN(submittedDate.getTime())) {
          // Only include submissions from the selected period
          if (submittedDate >= startDate) {
            const monthKey = submittedDate.toLocaleString('en-US', { month: 'short', year: '2-digit' });
            submissionsByMonth[monthKey] = (submissionsByMonth[monthKey] || 0) + 1;
            if (idx === 0) console.log('🔍 First submission date:', submittedDate, 'monthKey:', monthKey);
          }
        } else {
          if (idx === 0) console.log('🔍 Could not parse date. submittedAt:', submission.submittedAt, 'submitted_at:', submission.submitted_at, 'submission_date:', submission.submission_date, 'created_at:', submission.created_at);
        }
      });
      console.log('🔍 calculateGroupSubmissionTrend: submissionsByMonth =', submissionsByMonth);

      // Get the requested number of months
      const monthLabels = [];
      for (let i = monthsBack - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
        monthLabels.push(label);
      }
      
      const result = monthLabels.map(month => ({
        month,
        submissions: submissionsByMonth[month] || 0
      }));
      console.log('🔍 calculateGroupSubmissionTrend: final result =', result);
      return result;
    };

    // Calculate Member Task Submission Trend Data from task and revision submissions
    const calculateMemberTaskTrend = () => {
      const allTaskSubmissions = [
        ...(taskSubmissions || []),
        ...(revisionSubmissions || [])
      ];
      console.log('🔍 calculateMemberTaskTrend: allTaskSubmissions =', allTaskSubmissions);

      // Generate last N weeks with actual dates (based on taskWeeksPeriod)
      const generateWeekLabels = () => {
        const weeks = [];
        const now = new Date();
        const numWeeks = taskWeeksPeriod; // Use state variable (4 or 10)
        
        for (let i = numWeeks - 1; i >= 0; i--) {
          const weekEnd = new Date(now);
          weekEnd.setDate(now.getDate() - (now.getDay() + i * 7)); // Go back to Sunday
          
          const weekStart = new Date(weekEnd);
          weekStart.setDate(weekEnd.getDate() - 6); // Start is 6 days before Sunday
          
          const startStr = weekStart.toLocaleString('en-US', { month: 'short', day: 'numeric' });
          const endStr = weekEnd.toLocaleString('en-US', { month: 'short', day: 'numeric' });
          
          weeks.push({
            label: `${startStr} - ${endStr}`,
            key: `week-${i}`,
            start: weekStart,
            end: weekEnd
          });
        }
        
        return weeks;
      };

      if (allTaskSubmissions.length === 0) {
        console.log('🔍 calculateMemberTaskTrend: No submissions, returning default weeks');
        const weeks = generateWeekLabels();
        return weeks.map(w => ({ week: w.label, tasks: 0 }));
      }

      // Group submissions by week
      const weeks = generateWeekLabels();
      const tasksByWeek = {};
      
      weeks.forEach(w => {
        tasksByWeek[w.label] = 0;
      });
      
      allTaskSubmissions.forEach(submission => {
        const submittedDate = new Date(submission.submitted_at || submission.created_at);
        
        // Find which week this submission belongs to
        weeks.forEach(w => {
          if (submittedDate >= w.start && submittedDate <= w.end) {
            tasksByWeek[w.label]++;
          }
        });
      });
      console.log('🔍 calculateMemberTaskTrend: tasksByWeek =', tasksByWeek);

      // Create result with week labels
      const result = weeks.map(w => ({
        week: w.label,
        tasks: tasksByWeek[w.label] || 0
      }));
      console.log('🔍 calculateMemberTaskTrend: final result =', result);
      return result;
    };

    const submissionTrendData = calculateGroupSubmissionTrend();
    const activityTrendData = calculateMemberTaskTrend();
    
    // DEBUG LOGGING - After calculations
    console.log('📊 submissionTrendData (Group Submissions):', submissionTrendData);
    console.log('📊 activityTrendData (Member Tasks):', activityTrendData);

    return (
      <div className="course-overview-redesigned">
        {/* Welcome Message */}
        <div className="welcome-message-center">
         <h1 className="welcome-title-landing" style={{ color: 'white' }}>
  Welcome back, <span className="professor-name-gradient">
    {JSON.parse(localStorage.getItem('user') || '{}')?.firstName || 'Professor'}
  </span>!
</h1>

          <p className="welcome-subtitle-landing">Here's what's happening with your course today</p>
        </div>

        {/* Quick Action Buttons */}
        <div className="quick-actions-section">
          <button className="quick-action-card" onClick={() => {
            setActiveTab('projects');
            setShowProjectModal(true);
          }}>
            <FaPlus className="quick-action-icon" />
            <span className="quick-action-label">Create Project</span>
            </button>
          <button className="quick-action-card" onClick={() => {
            setActiveTab('announcements');
            setShowAnnouncementModal(true);
          }}>
            <FaBullhorn className="quick-action-icon" />
            <span className="quick-action-label">Create Announcement</span>
            </button>
          <button className="quick-action-card" onClick={() => setActiveTab('grade-submissions')}>
            <FaGraduationCap className="quick-action-icon" />
            <span className="quick-action-label">Grade Submissions</span>
            </button>
          <button className="quick-action-card" onClick={() => {
            setActiveTab('groups');
            setShowGroupModal(true);
          }}>
            <FaUsers className="quick-action-icon" />
            <span className="quick-action-label">Assign Groups</span>
            </button>
        </div>

        {/* Info Cards - 3 Cards */}
        <div id="course-overview-info-cards-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1.5rem',
          marginBottom: '2rem'
        }}>
          {/* Active Projects Card */}
          <div id="course-overview-active-projects-card" style={{
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
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <h3 style={{
                color: 'rgb(135, 35, 65)',
                fontWeight: '700',
                margin: '0px',
                fontSize: '1.1rem'
              }}>Active Projects</h3>
            </div>

            <div style={{
              padding: '1rem',
              flex: '1 1 0%',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '300px'
            }}>
              {(() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const activeProjects = projects.filter(p => {
                  if (!p.due_date) return false;
                  const dueDate = new Date(p.due_date);
                  dueDate.setHours(0, 0, 0, 0);
                  return dueDate >= today;
                });
                
                if (activeProjects.length === 0) {
                  return <p style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    textAlign: 'center',
                    padding: '2rem'
                  }}>No active projects</p>;
                }
                
                return activeProjects.slice(0, 4).map(project => (
                  <div 
                    key={project.id} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '0px',
                      background: 'rgb(255, 255, 255)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.15)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.25)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0px 2px 6px rgba(0, 0, 0, 0.15)';
                      e.currentTarget.style.transform = 'translateY(0px)';
                    }}
                    onClick={() => {
                      setActiveTab('projects');
                      setSelectedProject(project);
                    }}
                  >
                    <FaProjectDiagram style={{
                      fontSize: '1.25rem',
                      color: 'rgb(135, 35, 65)',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: 'rgb(50, 50, 50)',
                        margin: '0 0 0.25rem 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>{project.title}</p>
                      <div style={{
                        display: 'flex',
                        gap: '0.5rem',
                        flexWrap: 'wrap'
                      }}>
                        <span style={{
                          fontSize: '0.625rem',
                          fontWeight: '500',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          background: '#E0E7FF',
                          color: '#3730A3'
                        }}>
                          Start: {new Date(project.start_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                          })}
                        </span>
                        <span style={{
                          fontSize: '0.625rem',
                          fontWeight: '500',
                          padding: '0.25rem 0.5rem',
                          borderRadius: '9999px',
                          background: '#FEE2E2',
                          color: '#991B1B'
                        }}>
                          End: {new Date(project.due_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Submissions Card */}
          <div id="course-overview-submissions-card" style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease'
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
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <h3 style={{
                color: 'rgb(135, 35, 65)',
                fontWeight: '700',
                margin: '0px',
                fontSize: '1.1rem'
              }}>Recent Submissions</h3>
              <div style={{
                position: 'relative',
                display: 'inline-block',
                width: 'auto'
              }}>
                <button
                  onClick={() => {
                    const menu = document.getElementById('submission-filter-menu');
                    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                  }}
                  style={{
                    padding: '0.6rem 1.5rem 0.6rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgb(135, 35, 65)',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(135, 35, 65, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgb(110, 25, 50)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgb(135, 35, 65)'}
                >
                  {submissionFilter.charAt(0).toUpperCase() + submissionFilter.slice(1)}
                  <span style={{ marginLeft: '0.25rem' }}>▼</span>
                </button>
                <div
                  id="submission-filter-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    marginTop: '0.5rem',
                    background: 'rgb(135, 35, 65)',
                    border: '1.5px solid rgb(135, 35, 65)',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(135, 35, 65, 0.3)',
                    zIndex: '10000',
                    minWidth: '160px',
                    display: 'none',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => {
                      setSubmissionFilter('ungraded');
                      document.getElementById('submission-filter-menu').style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: submissionFilter === 'ungraded' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: submissionFilter === 'ungraded' ? '700' : '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = submissionFilter === 'ungraded' ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
                    }}
                  >
                    Ungraded
                  </button>
                  <button
                    onClick={() => {
                      setSubmissionFilter('graded');
                      document.getElementById('submission-filter-menu').style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: submissionFilter === 'graded' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: submissionFilter === 'graded' ? '700' : '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = submissionFilter === 'graded' ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
                    }}
                  >
                    Graded
                  </button>
                  <button
                    onClick={() => {
                      setSubmissionFilter('all');
                      document.getElementById('submission-filter-menu').style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: submissionFilter === 'all' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: submissionFilter === 'all' ? '700' : '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = submissionFilter === 'all' ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
                    }}
                  >
                    All
                  </button>
                </div>
              </div>
            </div>
            <div style={{
              padding: '1rem',
              flex: '1 1 0%',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '300px'
            }}>
              {(() => {
                // Combine phase and project submissions from the dashboard submissions data
                let allSubmissions = [
                  ...(submissions?.phaseSubmissions || []),
                  ...(submissions?.projectSubmissions || [])
                ].sort((a, b) => {
                  const dateA = new Date(a.submittedAt || a.submitted_at || a.created_at);
                  const dateB = new Date(b.submittedAt || b.submitted_at || b.created_at);
                  return dateB - dateA;
                });

                // Filter by submission status
                if (submissionFilter === 'ungraded') {
                  allSubmissions = allSubmissions.filter(sub => sub.status !== 'graded');
                } else if (submissionFilter === 'graded') {
                  allSubmissions = allSubmissions.filter(sub => sub.status === 'graded');
                }

                allSubmissions = allSubmissions.slice(0, 4);
                
                if (allSubmissions.length === 0) {
                  return <p style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    textAlign: 'center',
                    padding: '2rem'
                  }}>No {submissionFilter} submissions</p>;
                }
                
                return allSubmissions.map((sub, idx) => {
                  const isPhaseSubmission = sub.phaseNumber !== undefined;
                  const submissionType = isPhaseSubmission ? 'Phase' : 'Project';
                  const submissionDate = new Date(sub.submittedAt || sub.submitted_at || sub.created_at);
                  const dateStr = submissionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const timeStr = submissionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                  
                  return (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: '0px',
                      background: 'rgb(255, 255, 255)',
                      border: 'none',
                      boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.15)',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.25)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0px 2px 6px rgba(0, 0, 0, 0.15)';
                      e.currentTarget.style.transform = 'translateY(0px)';
                    }}
                    onClick={() => {
                      // Navigate to Grade Submissions tab with the selected submission
                      setActiveTab('grade-submissions');
                      
                      // Set up the grade submissions view with this submission
                      setGradeSubmissionsView(prev => ({
                        ...prev,
                        selectedProject: sub.projectId,
                        selectedSubmission: sub,
                        selectedTask: isPhaseSubmission ? `phase-${sub.phaseNumber}` : null,
                        selectedPhase: isPhaseSubmission ? sub.phaseNumber : null
                      }));
                    }}
                    >
                      <FaFileAlt style={{
                        fontSize: '1.25rem',
                        color: 'rgb(135, 35, 65)',
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: 'rgb(50, 50, 50)',
                          margin: '0 0 0.25rem 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {isPhaseSubmission 
                            ? `${sub.projectTitle} - Phase ${sub.phaseNumber}` 
                            : (sub.projectTitle || 'Project Submission')}
                        </p>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <span style={{
                            fontSize: '0.625rem',
                            fontWeight: '500',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            background: submissionType === 'Phase' ? '#DBEAFE' : '#FEF3C7',
                            color: submissionType === 'Phase' ? '#1E40AF' : '#92400E'
                          }}>
                            {submissionType}
                          </span>
                          <span style={{
                            fontSize: '0.625rem',
                            fontWeight: '600',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            background: sub.status === 'graded' ? '#DCFCE7' : '#FEE2E2',
                            color: sub.status === 'graded' ? '#166534' : '#991B1B'
                          }}>
                            {sub.status === 'graded' ? '✓ Graded' : '⊚ Ungraded'}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            color: 'rgb(120, 120, 120)'
                          }}>
                            {new Date(sub.submittedAt || sub.submitted_at || sub.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })} {new Date(sub.submittedAt || sub.submitted_at || sub.created_at).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Class Join Requests Card */}
          <div id="course-overview-join-requests-card" style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.3s ease'
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
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <h3 style={{
                color: 'rgb(135, 35, 65)',
                fontWeight: '700',
                margin: '0px',
                fontSize: '1.1rem'
              }}>Class Join Requests</h3>
              {(() => {
                const pendingCount = joinRequests.filter(req => req.status === 'pending').length;
                return pendingCount > 0 && (
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: '500',
                    padding: '0.25rem 0.625rem',
                    borderRadius: '9999px',
                    background: '#FEF3C7',
                    color: '#92400E'
                  }}>{pendingCount} pending</span>
                );
              })()}
            </div>
            <div style={{
              padding: '1rem',
              flex: '1 1 0%',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              maxHeight: '300px'
            }}>
              {(() => {
                const pendingRequests = joinRequests.filter(req => req.status === 'pending').slice(0, 4);
                
                if (pendingRequests.length === 0) {
                  return <p style={{
                    color: 'rgba(255, 255, 255, 0.7)',
                    textAlign: 'center',
                    padding: '2rem'
                  }}>No pending join requests</p>;
                }
                
                return pendingRequests.map((request, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    borderRadius: '0px',
                    background: 'rgb(255, 255, 255)',
                    border: 'none',
                    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.15)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.25)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = '0px 2px 6px rgba(0, 0, 0, 0.15)';
                    e.currentTarget.style.transform = 'translateY(0px)';
                  }}
                  >
                    <FaUserPlus style={{
                      fontSize: '1.25rem',
                      color: 'rgb(135, 35, 65)',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: 'rgb(50, 50, 50)',
                        margin: '0 0 0.25rem 0',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>{request.first_name} {request.last_name}</p>
                      <span style={{
                        fontSize: '0.75rem',
                        color: 'rgb(120, 120, 120)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block'
                      }}>{request.email}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

      

        {/* 2 Graph Cards */}
        <div className="graph-cards-grid">
          {/* Submission Tracking Graph */}
          <div className="graph-card-modern" style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
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
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <div>
                <h3 style={{
                  color: 'rgb(135, 35, 65)',
                  fontWeight: '700',
                  margin: '0px 0px 0.25rem 0px',
                  fontSize: '1.1rem'
                }}>Group Submission Tracking</h3>
                <p style={{
                  color: 'rgb(135, 35, 65)',
                  fontWeight: '500',
                  margin: '0px',
                  fontSize: '0.875rem'
                }}>Group submissions over time</p>
              </div>
              <div style={{
                position: 'relative',
                display: 'inline-block',
                width: 'auto'
              }}>
                <button
                  onClick={() => {
                    const menu = document.getElementById('submission-period-menu');
                    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                  }}
                  style={{
                    padding: '0.6rem 1.5rem 0.6rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgb(135, 35, 65)',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(135, 35, 65, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgb(110, 25, 50)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgb(135, 35, 65)'}
                >
                  {submissionTimePeriod === 3 ? 'Last 3 Months' : 'Last 6 Months'}
                  <span style={{ marginLeft: '0.25rem' }}>▼</span>
                </button>
                <div
                  id="submission-period-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    marginTop: '0.5rem',
                    background: 'rgb(135, 35, 65)',
                    border: '1.5px solid rgb(135, 35, 65)',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(135, 35, 65, 0.3)',
                    zIndex: '10000',
                    minWidth: '160px',
                    display: 'none',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => {
                      setSubmissionTimePeriod(3);
                      document.getElementById('submission-period-menu').style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: submissionTimePeriod === 3 ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: submissionTimePeriod === 3 ? '700' : '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = submissionTimePeriod === 3 ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
                    }}
                  >
                    Last 3 Months
                  </button>
                  <button
                    onClick={() => {
                      setSubmissionTimePeriod(6);
                      document.getElementById('submission-period-menu').style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: submissionTimePeriod === 6 ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: submissionTimePeriod === 6 ? '700' : '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = submissionTimePeriod === 6 ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
                    }}
                  >
                    Last 6 Months
                  </button>
                </div>
              </div>
            </div>
            <div style={{
              flex: '1 1 0%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px'
            }}>
              {submissionTrendData && submissionTrendData.length > 0 && submissionTrendData.some(d => d.submissions > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={submissionTrendData}>
                    <defs>
                      <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
                    <XAxis 
                      dataKey="month" 
                      stroke="#6B7280"
                      style={{ fontSize: '0.75rem' }}
                    />
                    <YAxis 
                      stroke="#6B7280"
                      style={{ fontSize: '0.75rem' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1.5px solid #D1D5DB',
                        borderRadius: '8px',
                        fontSize: '0.875rem'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="submissions" 
                      stroke="#667eea" 
                      strokeWidth={2}
                      fill="url(#colorSubmissions)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgb(135, 35, 65)',
                  textAlign: 'center',
                  gap: '1rem'
                }}>
                  <p style={{ fontSize: '1rem', fontWeight: '500', margin: 0 }}>No submission data available</p>
                  <p style={{ fontSize: '0.875rem', color: 'rgb(100, 100, 100)', margin: 0 }}>Check if submissions exist in your course</p>
                </div>
              )}
            </div>
          </div>
        
          {/* Student Activity Graph */}
          <div className="graph-card-modern" style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
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
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <div>
                <h3 style={{
                  color: 'rgb(135, 35, 65)',
                  fontWeight: '700',
                  margin: '0px 0px 0.25rem 0px',
                  fontSize: '1.1rem'
                }}>Member Task Submission Tracking</h3>
                <p style={{
                  color: 'rgb(135, 35, 65)',
                  fontWeight: '500',
                  margin: '0px',
                  fontSize: '0.875rem'
                }}>Tasks submitted by members to leaders</p>
              </div>
              <div style={{
                position: 'relative',
                display: 'inline-block',
                width: 'auto'
              }}>
                <button
                  onClick={() => {
                    const menu = document.getElementById('week-period-menu');
                    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                  }}
                  style={{
                    padding: '0.6rem 1.5rem 0.6rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgb(135, 35, 65)',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(135, 35, 65, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgb(110, 25, 50)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgb(135, 35, 65)'}
                >
                  {taskWeeksPeriod === 4 ? 'Last 4 Weeks' : 'Last 10 Weeks'}
                  <span style={{ marginLeft: '0.25rem' }}>▼</span>
                </button>
                <div
                  id="week-period-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: '0',
                    marginTop: '0.5rem',
                    background: 'rgb(135, 35, 65)',
                    border: '1.5px solid rgb(135, 35, 65)',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(135, 35, 65, 0.3)',
                    zIndex: '10000',
                    minWidth: '150px',
                    display: 'none',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => {
                      setTaskWeeksPeriod(4);
                      document.getElementById('week-period-menu').style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: taskWeeksPeriod === 4 ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: taskWeeksPeriod === 4 ? '700' : '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = taskWeeksPeriod === 4 ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
                    }}
                  >
                    Last 4 Weeks
                  </button>
                  <button
                    onClick={() => {
                      setTaskWeeksPeriod(10);
                      document.getElementById('week-period-menu').style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: taskWeeksPeriod === 10 ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: taskWeeksPeriod === 10 ? '700' : '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = taskWeeksPeriod === 10 ? 'rgba(255, 255, 255, 0.2)' : 'transparent';
                    }}
                  >
                    Last 10 Weeks
                  </button>
                </div>
              </div>
            </div>
            <div style={{
              flex: '1 1 0%',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px'
            }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityTrendData}>
                  <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#43e97b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#43e97b" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1D5DB" />
                  <XAxis 
                    dataKey="week" 
                    stroke="#6B7280"
                    style={{ fontSize: '0.75rem' }}
                  />
                  <YAxis 
                    stroke="#6B7280"
                    style={{ fontSize: '0.75rem' }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1.5px solid #D1D5DB',
                      borderRadius: '8px',
                      fontSize: '0.875rem'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="tasks" 
                    stroke="#43e97b" 
                    strokeWidth={2}
                    fill="url(#colorActivity)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderStudents() {
    // Sort students based on sort option
    const sortedStudents = [...students].sort((a, b) => {
      switch(studentSortBy) {
        case 'first-name-first':
          const firstNameComp = a.first_name.localeCompare(b.first_name);
          if (firstNameComp !== 0) return firstNameComp;
          return a.last_name.localeCompare(b.last_name);
        case 'student-number':
          return a.student_number.localeCompare(b.student_number);
        case 'last-name-first':
        default:
      const lastNameComparison = a.last_name.localeCompare(b.last_name);
      if (lastNameComparison !== 0) return lastNameComparison;
      return a.first_name.localeCompare(b.first_name);
      }
    });

    const currentList = sortedStudents;
    const currentSelected = selectedStudent;

    return (
      <div style={{ padding: '2rem', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', maxWidth: '100%' }}>
          {/* Left Side - Student List Card */}
          <div style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '700px',
            minHeight: '700px',
            maxHeight: '700px'
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

            {/* Header */}
            <div style={{
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <h3 style={{
                color: 'rgb(135, 35, 65)',
                fontWeight: '700',
                margin: '0px',
                fontSize: '1.1rem'
              }}>Students ({currentList.length})</h3>
              <div style={{ position: 'relative', display: 'inline-block', width: 'auto' }}>
                <button
                  onClick={() => {
                    const menu = document.getElementById('student-sort-menu');
                    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
                  }}
                  style={{
                    padding: '0.6rem 1.5rem 0.6rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'rgb(135, 35, 65)',
                    color: 'white',
                    fontWeight: '600',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 8px rgba(135, 35, 65, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => e.target.style.background = 'rgb(110, 25, 50)'}
                  onMouseLeave={(e) => e.target.style.background = 'rgb(135, 35, 65)'}
                >
                  {studentSortBy === 'first-name-first' ? 'First Name First' : 
                   studentSortBy === 'student-number' ? 'Student Number' : 
                   'Last Name First'}
                  <span style={{ marginLeft: '0.25rem' }}>▼</span>
                </button>
                <div
                  id="student-sort-menu"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: '0',
                    marginTop: '0.5rem',
                    background: 'rgb(135, 35, 65)',
                    border: '1.5px solid rgb(135, 35, 65)',
                    borderRadius: '6px',
                    boxShadow: '0 4px 12px rgba(135, 35, 65, 0.3)',
                    zIndex: '10000',
                    minWidth: '180px',
                    display: 'none',
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => {
                      setStudentSortBy('last-name-first');
                      document.getElementById('student-sort-menu').style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: studentSortBy === 'last-name-first' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: studentSortBy === 'last-name-first' ? '700' : '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                    onMouseLeave={(e) => e.target.style.background = studentSortBy === 'last-name-first' ? 'rgba(255, 255, 255, 0.2)' : 'transparent'}
                  >
                    Last Name First
                  </button>
                  <button
                    onClick={() => {
                      setStudentSortBy('first-name-first');
                      document.getElementById('student-sort-menu').style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: studentSortBy === 'first-name-first' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: studentSortBy === 'first-name-first' ? '700' : '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                    onMouseLeave={(e) => e.target.style.background = studentSortBy === 'first-name-first' ? 'rgba(255, 255, 255, 0.2)' : 'transparent'}
                  >
                    First Name First
                  </button>
                  <button
                    onClick={() => {
                      setStudentSortBy('student-number');
                      document.getElementById('student-sort-menu').style.display = 'none';
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: studentSortBy === 'student-number' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                      color: 'white',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: studentSortBy === 'student-number' ? '700' : '600',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                    onMouseLeave={(e) => e.target.style.background = studentSortBy === 'student-number' ? 'rgba(255, 255, 255, 0.2)' : 'transparent'}
                  >
                    Student Number
                  </button>
                </div>
              </div>
            </div>

            {/* Student List */}
            <div style={{
              padding: '1rem',
              flex: '1 1 0%',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {currentList.length > 0 ? (
                currentList.map((student, index) => {
                  const isSelected = currentSelected?.id === student.id;
                  return (
                    <div 
                      key={student.id} 
                      onClick={() => setSelectedStudent(student)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: '0px',
                        background: isSelected ? 'rgb(245, 245, 245)' : 'rgb(255, 255, 255)',
                        border: isSelected ? '2px solid rgb(135, 35, 65)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: 'rgba(0, 0, 0, 0.15) 0px 2px 6px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.25)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.boxShadow = '0px 2px 6px rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.transform = 'translateY(0px)';
                        }
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: student.profile_image_url ? 'transparent' : 'rgb(135, 35, 65)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        flexShrink: 0,
                        overflow: 'hidden'
                      }}>
                        {student.profile_image_url ? (
                          <img 
                            src={getSupabaseImageUrl(student.profile_image_url)} 
                            alt={`${student.first_name} ${student.last_name}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.style.background = 'rgb(135, 35, 65)';
                              e.target.parentElement.innerHTML = `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`;
                            }}
                          />
                        ) : (
                          `${student.first_name?.[0] || ''}${student.last_name?.[0] || ''}`
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: 'rgb(50, 50, 50)',
                          margin: '0 0 0.25rem 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {studentSortBy === 'first-name-first' 
                            ? `${student.first_name} ${student.last_name}`
                            : `${student.last_name}, ${student.first_name}`}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.625rem',
                            fontWeight: '500',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            background: 'rgb(224, 231, 255)',
                            color: 'rgb(55, 48, 163)'
                          }}>
                            {student.student_number}
                          </span>
                          {(() => {
                            const studentGroup = groups.find(group => 
                              group.course_group_members?.some(member => 
                                member.student_id === student.student_id || member.student_id === student.id
                              )
                            );
                            
                            if (studentGroup) {
                              const memberInfo = studentGroup.course_group_members?.find(member => 
                                member.student_id === student.student_id || member.student_id === student.id
                              );
                              const isLeader = memberInfo?.role === 'leader';
                              return (
                                <span style={{
                                  fontSize: '0.625rem',
                                  fontWeight: '500',
                                  padding: '0.125rem 0.5rem',
                                  borderRadius: '9999px',
                                  background: '#DCFCE7',
                                  color: '#166534'
                                }}>
                                  Group {studentGroup.group_number}: {isLeader ? 'Leader' : 'Member'}
                                </span>
                              );
                            } else {
                              return (
                                <span style={{
                                  fontSize: '0.625rem',
                                  fontWeight: '500',
                                  padding: '0.125rem 0.5rem',
                                  borderRadius: '9999px',
                                  background: '#FEE2E2',
                                  color: '#991B1B'
                                }}>
                                  Unassigned
                                </span>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{
                  color: 'rgba(255, 255, 255, 0.7)',
                  textAlign: 'center',
                  padding: '2rem'
                }}>No students enrolled</p>
              )}
            </div>
          </div>

          {/* Right Side - Student Details Card */}
          <div style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '700px',
            minHeight: '700px',
            maxHeight: '700px',
            width: '100%',
            flex: '1'
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

            {currentSelected ? (
              <>
                {/* Header */}
                <div style={{
                  padding: '1.5rem 1.5rem 1rem',
                  borderBottom: '2px solid rgb(135, 35, 65)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgb(255, 255, 255)'
                }}>
                  <h3 style={{
                    color: 'rgb(135, 35, 65)',
                    fontWeight: '700',
                    margin: '0px',
                    fontSize: '1.1rem'
                  }}>Student Details</h3>
                </div>

                {/* Content */}
                <div style={{
                  padding: '1.5rem',
                  flex: '1 1 0%',
                  overflow: 'auto',
                  background: 'white'
                }}>
                  {/* Profile Header */}
                  <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    marginBottom: '1.5rem',
                    paddingBottom: '1.5rem',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <div style={{
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: currentSelected.profile_image_url ? 'transparent' : 'rgb(135, 35, 65)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '700',
                      fontSize: '1.5rem',
                      flexShrink: 0,
                      overflow: 'hidden',
                      border: '3px solid rgb(135, 35, 65)'
                    }}>
                      {currentSelected.profile_image_url ? (
                        <img 
                          src={getSupabaseImageUrl(currentSelected.profile_image_url)} 
                          alt={`${currentSelected.first_name} ${currentSelected.last_name}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.style.background = 'rgb(135, 35, 65)';
                            e.target.parentElement.innerHTML = `${currentSelected.first_name?.[0] || ''}${currentSelected.last_name?.[0] || ''}`;
                          }}
                        />
                      ) : (
                        `${currentSelected.first_name?.[0] || ''}${currentSelected.last_name?.[0] || ''}`
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: 'rgb(50, 50, 50)',
                        margin: '0 0 0.5rem 0'
                      }}>
                        {currentSelected.first_name} {currentSelected.middle_name ? `${currentSelected.middle_name} ` : ''}{currentSelected.last_name}
                      </h2>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'rgb(120, 120, 120)',
                        margin: '0 0 0.25rem 0'
                      }}>{currentSelected.student_number}</p>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'rgb(120, 120, 120)',
                        margin: '0 0 0.25rem 0'
                      }}>{currentSelected.email}</p>
                      <p style={{
                        fontSize: '0.875rem',
                        color: 'rgb(120, 120, 120)',
                        margin: '0'
                      }}>{currentSelected.program} - {currentSelected.college}</p>
                    </div>
                  </div>

                  {/* Information Grid */}
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    {/* Academic Information */}
                    <div>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'rgb(135, 35, 65)',
                        margin: '0 0 0.75rem 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>Academic Information</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{
                            fontSize: '0.75rem',
                            color: 'rgb(120, 120, 120)',
                            display: 'block',
                            marginBottom: '0.25rem'
                          }}>Year Level</label>
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            background: '#F3F4F6',
                            display: 'inline-block'
                          }}>
                            {currentSelected.year_level ? `Year ${currentSelected.year_level}` : 'Not specified'}
                          </span>
                        </div>
                        <div>
                          <label style={{
                            fontSize: '0.75rem',
                            color: 'rgb(120, 120, 120)',
                            display: 'block',
                            marginBottom: '0.25rem'
                          }}>Student Type</label>
                          <span style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            background: '#F3F4F6',
                            display: 'inline-block'
                          }}>
                            {currentSelected.class_status || 'Not specified'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Course Status */}
                    <div>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'rgb(135, 35, 65)',
                        margin: '0 0 0.75rem 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>Course Status</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{
                            fontSize: '0.75rem',
                            color: 'rgb(120, 120, 120)',
                            display: 'block',
                            marginBottom: '0.25rem'
                          }}>Group</label>
                          {(() => {
                            const studentGroup = groups.find(group => 
                              group.course_group_members?.some(member => 
                                member.student_id === currentSelected.student_id || member.student_id === currentSelected.id
                              )
                            );
                            
                            return studentGroup ? (
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                background: '#DCFCE7',
                                color: '#166534',
                                display: 'inline-block'
                              }}>
                                Group #{studentGroup.group_number}
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                background: '#FEE2E2',
                                color: '#991B1B',
                                display: 'inline-block'
                              }}>
                                Not assigned
                              </span>
                            );
                          })()}
                        </div>
                        <div>
                          <label style={{
                            fontSize: '0.75rem',
                            color: 'rgb(120, 120, 120)',
                            display: 'block',
                            marginBottom: '0.25rem'
                          }}>Position</label>
                          {(() => {
                            const studentGroup = groups.find(group => 
                              group.course_group_members?.some(member => 
                                member.student_id === currentSelected.student_id || member.student_id === currentSelected.id
                              )
                            );
                            
                            return studentGroup ? (
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                background: '#F3F4F6',
                                display: 'inline-block'
                              }}>
                                {(() => {
                                  const isLeader = studentGroup.leader_id === (currentSelected.student_id || currentSelected.id);
                                  return isLeader ? 'Group Leader' : 'Group Member';
                                })()}
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.875rem',
                                fontWeight: '500',
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                background: '#F3F4F6',
                                display: 'inline-block'
                              }}>-</span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Enrollment Status */}
                    <div>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'rgb(135, 35, 65)',
                        margin: '0 0 0.75rem 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>Enrollment Status</h4>
                      <span style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        padding: '0.375rem 0.75rem',
                        borderRadius: '4px',
                        background: '#DCFCE7',
                        color: '#166534',
                        display: 'inline-block'
                      }}>Active</span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      paddingTop: '1rem',
                      borderTop: '1px solid #E5E7EB',
                      flexWrap: 'wrap'
                    }}>
                      {currentSelected.registration_card_url && (
                        <a 
                          href={getSupabaseImageUrl(currentSelected.registration_card_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: '1px solid rgb(135, 35, 65)',
                            background: 'white',
                            color: 'rgb(135, 35, 65)',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgb(135, 35, 65)';
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'white';
                            e.target.style.color = 'rgb(135, 35, 65)';
                          }}
                        >
                          <FaFileAlt size={14} />
                          Registration Card
                        </a>
                      )}
                      {currentSelected.profile_image_url && (
                        <a 
                          href={getSupabaseImageUrl(currentSelected.profile_image_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '6px',
                            border: '1px solid rgb(135, 35, 65)',
                            background: 'white',
                            color: 'rgb(135, 35, 65)',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgb(135, 35, 65)';
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'white';
                            e.target.style.color = 'rgb(135, 35, 65)';
                          }}
                        >
                          <FaUser size={14} />
                          Profile Image
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Header */}
                <div style={{
                  padding: '1.5rem 1.5rem 1rem',
                  borderBottom: '2px solid rgb(135, 35, 65)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgb(255, 255, 255)'
                }}>
                  <h3 style={{
                    color: 'rgb(135, 35, 65)',
                    fontWeight: '700',
                    margin: '0px',
                    fontSize: '1.1rem'
                  }}>Student Details</h3>
                </div>
                
                {/* Empty State */}
                <div style={{
                  padding: '3rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '1',
                  background: 'white'
                }}>
                  <FaUser size={64} color="rgba(135, 35, 65, 0.3)" />
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    color: 'rgb(50, 50, 50)',
                    margin: '1rem 0 0.5rem 0'
                  }}>Select a Student</h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: 'rgb(120, 120, 120)',
                    margin: 0,
                    textAlign: 'center'
                  }}>Click on a student from the list to view their profile and details</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderGroups() {
    const unassignedStudents = students.filter(student => 
      !groups.some(group => 
        group.course_group_members?.some(member => 
          member.student_id === student.student_id || member.student_id === student.id
        )
      )
    );

    return (
      <div style={{ padding: '2rem', width: '100%', margin: '0 auto' }}>
        {/* Create Button and Delete All Button */}
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setShowGroupModal(true)}
            style={{
              padding: '0.75rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              background: 'rgb(135, 35, 65)',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(135, 35, 65, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgb(110, 25, 50)'}
            onMouseLeave={(e) => e.target.style.background = 'rgb(135, 35, 65)'}
          >
            <FaUsers size={18} />
            Create Groups
          </button>
          
          {groups.length > 0 && (
            <button 
              onClick={async () => {
                if (window.confirm(`Are you sure you want to delete all ${groups.length} group(s)? This action cannot be undone.`)) {
                  try {
                    setLoading(true);
                    const token = localStorage.getItem('token');
                    const response = await fetch(`${API_BASE_URL}/api/professor/course/${courseId}/delete-all-groups`, {
                      method: 'DELETE',
                      headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                      }
                    });

                    if (!response.ok) {
                      const data = await response.json();
                      throw new Error(data.error || 'Failed to delete groups');
                    }

                    // Refresh data
                    await fetchCourseData();
                    
                    // Show success notification
                    setNotifications(prev => [...prev, {
                      id: Date.now(),
                      type: 'success',
                      message: 'All groups deleted successfully',
                      timestamp: new Date()
                    }]);
                  } catch (error) {
                    console.error('Error deleting groups:', error);
                    setNotifications(prev => [...prev, {
                      id: Date.now(),
                      type: 'error',
                      message: error.message || 'Failed to delete groups',
                      timestamp: new Date()
                    }]);
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              style={{
                padding: '0.75rem 1.5rem',
                borderRadius: '6px',
                border: '2px solid rgb(244, 67, 54)',
                background: 'transparent',
                color: 'rgb(244, 67, 54)',
                fontWeight: '600',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgb(244, 67, 54)';
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'transparent';
                e.target.style.color = 'rgb(244, 67, 54)';
              }}
            >
              <FaTrash size={16} />
              Delete All Groups ({groups.length})
            </button>
          )}
        </div>

        {/* Unassigned Students Card - Moved to Top */}
        {unassignedStudents.length > 0 && (
          <div style={{
            marginBottom: '2rem',
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden'
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

            {/* Header */}
            <div style={{
              padding: '1.5rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              backgroundColor: 'rgb(255, 255, 255)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={20} color="rgb(135, 35, 65)" />
                <h4 style={{
                  color: 'rgb(135, 35, 65)',
                  fontWeight: '700',
                  margin: '0px',
                  fontSize: '1.1rem'
                }}>
                  Unassigned Students ({unassignedStudents.length})
                </h4>
              </div>
              <p style={{
                fontSize: '0.875rem',
                color: 'rgb(120, 120, 120)',
                margin: '0px'
              }}>These students are not yet assigned to any group</p>
            </div>

            {/* Content */}
            <div style={{
              padding: '1.5rem',
              background: 'white',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem'
            }}>
              {unassignedStudents.map((student) => (
                <div key={student.id} style={{
                  background: 'white',
                  border: '1px solid rgb(230, 230, 230)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0px 4px 12px rgba(135, 35, 65, 0.15)';
                  e.currentTarget.style.borderColor = 'rgb(135, 35, 65)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgb(230, 230, 230)';
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: 'rgb(135, 35, 65)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      {student.profile_image_url ? (
                        <img 
                          src={getSupabaseImageUrl(student.profile_image_url)} 
                          alt={`${student.first_name} ${student.last_name}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div style={{
                        display: student.profile_image_url ? 'none' : 'flex',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '1.1rem'
                      }}>
                        {student.first_name?.[0]}{student.last_name?.[0]}
                      </div>
                    </div>
                    <div style={{
                      flex: 1,
                      minWidth: 0
                    }}>
                      <h5 style={{
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: 'rgb(50, 50, 50)',
                        margin: '0 0 0.25rem 0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{student.first_name} {student.last_name}</h5>
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'rgb(120, 120, 120)',
                        margin: '0',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>{student.student_number}</p>
                    </div>
                  </div>
                  <button style={{
                    width: '100%',
                    padding: '0.5rem',
                    background: 'rgb(135, 35, 65)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    setStudentToAssign(student);
                    setShowGroupModal(true);
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgb(105, 25, 50)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgb(135, 35, 65)';
                  }}>
                    <FaUserPlus size={12} />
                    Assign to Group
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Groups Cards */}
        {groups.length > 0 ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {groups.map((group) => {
              const memberCount = group.course_group_members?.length || 0;
              const leader = group.course_group_members?.find(member => member.role === 'leader');
              const isComplete = memberCount >= 3;
              const members = (group.course_group_members || []).filter(m => m.role !== 'leader');
              
              return (
                <div 
                  key={group.id}
                  onClick={() => setSelectedGroupForDetails(group)}
                  style={{
                    position: 'relative',
                    background: 'rgba(9, 18, 44, 0.15)',
                    border: '0.1px solid rgb(95, 95, 95)',
                    borderRadius: '0px',
                    boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
                    backdropFilter: 'blur(3.2px) saturate(120%)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0px 6px 16px rgba(0, 0, 0, 0.6)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'rgba(0, 0, 0, 0.5) 0px 4px 12px';
                    e.currentTarget.style.transform = 'translateY(0px)';
                  }}
                >
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

                  {/* Header */}
                  <div style={{
                    padding: '1.5rem 1.5rem 1rem',
                    borderBottom: '2px solid rgb(135, 35, 65)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: 'rgb(255, 255, 255)'
                  }}>
                    <h3 style={{
                      color: 'rgb(135, 35, 65)',
                      fontWeight: '700',
                      margin: '0px',
                      fontSize: '1.1rem'
                    }}>Group {group.group_number}</h3>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      background: isComplete ? '#DCFCE7' : '#FEE2E2',
                      color: isComplete ? '#166534' : '#991B1B'
                    }}>
                      {isComplete ? 'Complete' : 'Incomplete'}
                    </span>
                  </div>

                  {/* Content */}
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(9, 18, 44, 0.15)',
                    backdropFilter: 'blur(3.2px) saturate(120%)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div>
                      <h4 style={{
                        fontSize: '1rem',
                        fontWeight: '600',
                        color: 'white',
                        margin: '0 0 0.5rem 0'
                      }}>{group.group_name}</h4>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontSize: '0.875rem',
                        color: 'rgb(200, 200, 200)'
                      }}>
                        <FaUsers size={14} />
                        <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        color: 'white',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>Leader</div>
                      <div style={{
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: 'white',
                        padding: '0.5rem',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        {leader ? `${leader.studentaccounts?.first_name || leader.first_name || ''} ${leader.studentaccounts?.last_name || leader.last_name || ''}`.trim() || 'No leader name' : 'Not assigned'}
                      </div>
                    </div>

                    {members.length > 0 && (
                      <div>
                        <div style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          color: 'white',
                          marginBottom: '0.5rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>Members ({members.length})</div>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}>
                          {members.map((member, idx) => (
                            <div key={idx} style={{
                              fontSize: '0.875rem',
                              color: 'white',
                              padding: '0.25rem 0.5rem',
                              background: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '4px',
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                              {`${member.studentaccounts?.first_name || member.first_name || ''} ${member.studentaccounts?.last_name || member.last_name || ''}`.trim() || 'Unknown'}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4rem 2rem',
            textAlign: 'center'
          }}>
            <div style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: 'rgba(135, 35, 65, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              <FaUsers size={60} color="rgb(135, 35, 65)" />
            </div>
            <h3 style={{
              fontSize: '1.5rem',
              fontWeight: '700',
              color: 'rgba(255, 255, 255, 1)',
              marginBottom: '0.5rem'
            }}>No Groups Created Yet</h3>
            <p style={{
              fontSize: '1rem',
              color: 'rgb(120, 120, 120)',
              marginBottom: '2rem',
              maxWidth: '500px'
            }}>Create your first group to organize students and manage collaborative projects</p>
            <button 
              onClick={() => setShowGroupModal(true)}
              style={{
                padding: '0.875rem 2rem',
                background: 'rgb(135, 35, 65)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s ease',
                boxShadow: '0px 4px 12px rgba(135, 35, 65, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgb(105, 25, 50)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0px 6px 16px rgba(135, 35, 65, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgb(135, 35, 65)';
                e.currentTarget.style.transform = 'translateY(0px)';
                e.currentTarget.style.boxShadow = '0px 4px 12px rgba(135, 35, 65, 0.3)';
              }}
            >
              <FaUsers size={20} />
              Create Your First Group
            </button>
          </div>
        )}

        {/* Group Creation Modal */}
        {showGroupModal && (
          <SimplifiedGroupCreator 
            courseId={courseId}
            students={students}
            groups={groups}
            studentToAssign={studentToAssign}
            onClose={() => {
              setShowGroupModal(false);
              setStudentToAssign(null);
            }}
            onGroupsCreated={fetchCourseData}
            getSupabaseImageUrl={getSupabaseImageUrl}
          />
        )}

        {/* Group Details Modal - Simplified */}
        {selectedGroupForDetails && (
          <GroupModalWrapper 
            group={selectedGroupForDetails}
            students={students}
            onClose={() => setSelectedGroupForDetails(null)}
            onDelete={handleGroupDeletion}
            getSupabaseImageUrl={getSupabaseImageUrl}
          />
        )}
      </div>
    );
  }

  function renderProjects() {
    // Filter and sort projects
    const filteredProjects = projects.filter(project => {
      const now = new Date();
      const dueDate = new Date(project.due_date);
      const isCurrent = dueDate >= now;
      
      // Apply category filter
      if (projectFilter === 'current' && !isCurrent) return false;
      if (projectFilter === 'past' && isCurrent) return false;
      
      // Apply search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return project.title.toLowerCase().includes(query) || 
               project.description.toLowerCase().includes(query);
      }
      
      return true;
    }).sort((a, b) => {
      // Sort by nearest due date first
      return new Date(a.due_date) - new Date(b.due_date);
    });

    const currentProjects = projects.filter(p => new Date(p.due_date) >= new Date());
    const pastProjects = projects.filter(p => new Date(p.due_date) < new Date());

    return (
      <div style={{ padding: '2rem', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', maxWidth: '100%' }}>
          {/* Left Side - Project List Card */}
          <div style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '700px',
            minHeight: '700px',
            maxHeight: '700px'
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

            {/* Header */}
            <div style={{
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <h3 style={{
                color: 'rgb(135, 35, 65)',
                fontWeight: '700',
                margin: '0px',
                fontSize: '1.1rem'
              }}>Projects ({filteredProjects.length})</h3>
              <button 
                onClick={() => setShowProjectModal(true)}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgb(135, 35, 65)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(135, 35, 65, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => e.target.style.background = 'rgb(110, 25, 50)'}
                onMouseLeave={(e) => e.target.style.background = 'rgb(135, 35, 65)'}
              >
                <FaProjectDiagram size={16} />
                Create
              </button>
            </div>

            {/* Filter Tabs */}
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'rgb(255, 255, 255)',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <button 
                onClick={() => setProjectFilter('current')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: projectFilter === 'current' ? '2px solid rgb(135, 35, 65)' : '1px solid rgb(200, 200, 200)',
                  background: projectFilter === 'current' ? 'rgba(135, 35, 65, 0.1)' : 'white',
                  color: projectFilter === 'current' ? 'rgb(135, 35, 65)' : 'rgb(100, 100, 100)',
                  fontWeight: projectFilter === 'current' ? '600' : '500',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <FaClock size={11} />
                Active
              </button>
              <button 
                onClick={() => setProjectFilter('past')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: projectFilter === 'past' ? '2px solid rgb(135, 35, 65)' : '1px solid rgb(200, 200, 200)',
                  background: projectFilter === 'past' ? 'rgba(135, 35, 65, 0.1)' : 'white',
                  color: projectFilter === 'past' ? 'rgb(135, 35, 65)' : 'rgb(100, 100, 100)',
                  fontWeight: projectFilter === 'past' ? '600' : '500',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <FaCalendarAlt size={11} />
                Past
              </button>
              <button 
                onClick={() => setProjectFilter('all')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: projectFilter === 'all' ? '2px solid rgb(135, 35, 65)' : '1px solid rgb(200, 200, 200)',
                  background: projectFilter === 'all' ? 'rgba(135, 35, 65, 0.1)' : 'white',
                  color: projectFilter === 'all' ? 'rgb(135, 35, 65)' : 'rgb(100, 100, 100)',
                  fontWeight: projectFilter === 'all' ? '600' : '500',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <FaProjectDiagram size={11} />
                All
              </button>
            </div>

            {/* Search */}
            <div style={{
              padding: '0 1.5rem 1rem',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <FaSearch size={13} style={{
                  position: 'absolute',
                  left: '0.75rem',
                  color: 'rgb(135, 35, 65)',
                  pointerEvents: 'none',
                  zIndex: 1
                }} />
                <input
                  type="text"
                  placeholder="Search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  ref={(el) => {
                    if (el) {
                      el.style.setProperty('background', 'white', 'important');
                      el.style.setProperty('color', 'rgb(50, 50, 50)', 'important');
                      el.style.setProperty('border', '1.5px solid rgb(135, 35, 65)', 'important');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem 0.6rem 2.5rem',
                    borderRadius: '6px',
                    fontSize: '0.813rem',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.setProperty('border', '1.5px solid rgb(135, 35, 65)', 'important');
                    e.target.style.boxShadow = '0 0 0 3px rgba(135, 35, 65, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.setProperty('border', '1.5px solid rgb(135, 35, 65)', 'important');
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Project List */}
            <div style={{
              padding: '1rem',
              flex: '1 1 0%',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project, index) => {
                  const dueDate = new Date(project.due_date);
                  const now = new Date();
                  const isCurrent = dueDate >= now;
                  const daysRemaining = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                  const isSelected = selectedProject?.id === project.id;
                  
                  return (
                    <div 
                      key={project.id} 
                      onClick={() => handleProjectSelection(project)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        padding: '0.75rem',
                        borderRadius: '0px',
                        background: isSelected ? 'rgb(245, 245, 245)' : 'rgb(255, 255, 255)',
                        border: isSelected ? '2px solid rgb(135, 35, 65)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: 'rgba(0, 0, 0, 0.15) 0px 2px 6px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.25)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.boxShadow = '0px 2px 6px rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.transform = 'translateY(0px)';
                        }
                      }}
                    >
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: isCurrent ? 'rgb(135, 35, 65)' : 'rgb(150, 150, 150)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '0.75rem',
                        flexShrink: 0
                      }}>
                        {String(index + 1).padStart(2, '0')}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          color: 'rgb(50, 50, 50)',
                          margin: '0 0 0.25rem 0',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {project.title}
                        </p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: '0.625rem',
                            fontWeight: '500',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            background: isCurrent ? 'rgb(220, 252, 231)' : 'rgb(254, 226, 226)',
                            color: isCurrent ? 'rgb(22, 101, 52)' : 'rgb(153, 27, 27)'
                          }}>
                            {isCurrent ? 'Active' : 'Past'}
                          </span>
                          <span style={{
                            fontSize: '0.625rem',
                            fontWeight: '500',
                            padding: '0.125rem 0.5rem',
                            borderRadius: '9999px',
                            background: 'rgb(224, 231, 255)',
                            color: 'rgb(55, 48, 163)'
                          }}>
                            {isCurrent ? `${daysRemaining > 0 ? daysRemaining : 0} days left` : 'Overdue'}
                          </span>
                          {(project.project_phases && project.project_phases.length > 0) && (
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: '500',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              background: 'rgb(243, 244, 246)',
                              color: 'rgb(75, 85, 99)'
                            }}>
                              {project.project_phases.length} {project.project_phases.length === 1 ? 'phase' : 'phases'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{
                  color: 'rgba(100, 100, 100, 0.7)',
                  textAlign: 'center',
                  padding: '2rem'
                }}>No projects found</p>
              )}
            </div>
          </div>

          {/* Right Side - Project Details Card */}
          <div style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '700px',
            minHeight: '700px',
            maxHeight: '700px',
            width: '100%',
            flex: '1'
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

            {selectedProject ? (
              <>
                {/* Header */}
                <div style={{
                  padding: '1.5rem 1.5rem 1rem',
                  borderBottom: '2px solid rgb(135, 35, 65)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'rgb(255, 255, 255)'
                }}>
                  <h3 style={{
                    color: 'rgb(135, 35, 65)',
                    fontWeight: '700',
                    margin: '0px',
                    fontSize: '1.1rem'
                  }}>Project Details</h3>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button 
                      onClick={() => handleEditProject(selectedProject)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'rgb(135, 35, 65)',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgb(110, 25, 50)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgb(135, 35, 65)'}
                    >
                      <FaEdit size={14} />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteProject(selectedProject)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'rgb(220, 38, 38)',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgb(185, 28, 28)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgb(220, 38, 38)'}
                    >
                      <FaTrash size={14} />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div style={{
                  padding: '1.5rem',
                  flex: '1 1 0%',
                  overflow: 'auto',
                  background: 'white'
                }}>
                  {/* Project Title Section */}
                  <div style={{
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'center',
                    marginBottom: '1.5rem',
                    paddingBottom: '1.5rem',
                    borderBottom: '1px solid #E5E7EB'
                  }}>
                    <div style={{ flex: 1 }}>
                      <h2 style={{
                        fontSize: '1.25rem',
                        fontWeight: '700',
                        color: 'rgb(50, 50, 50)',
                        margin: '0 0 0.5rem 0'
                      }}>
                        {selectedProject.title}
                      </h2>
                      {(() => {
                        const dueDate = new Date(selectedProject.due_date);
                        const now = new Date();
                        const isCurrent = dueDate >= now;
                        return (
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '9999px',
                            background: isCurrent ? 'rgb(220, 252, 231)' : 'rgb(254, 226, 226)',
                            color: isCurrent ? 'rgb(22, 101, 52)' : 'rgb(153, 27, 27)',
                            display: 'inline-block'
                          }}>
                            {isCurrent ? 'Active' : 'Past'}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Information Grid */}
                  <div style={{ display: 'grid', gap: '1.25rem' }}>
                    {/* Timeline Information */}
                    <div style={{
                      background: 'rgb(249, 250, 251)',
                      border: '1px solid rgb(229, 231, 235)',
                      borderRadius: '8px',
                      padding: '1rem'
                    }}>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        color: 'rgb(135, 35, 65)',
                        margin: '0 0 0.75rem 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaCalendarAlt size={14} />
                        Timeline
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{
                            fontSize: '0.7rem',
                            color: 'rgb(100, 100, 100)',
                            display: 'block',
                            marginBottom: '0.35rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>Start Date</label>
                          <span style={{
                            fontSize: '0.813rem',
                            fontWeight: '600',
                            color: 'rgb(50, 50, 50)',
                            display: 'block'
                          }}>
                            {formatUTCDate(selectedProject.start_date || selectedProject.created_at)}
                          </span>
                        </div>
                        <div>
                          <label style={{
                            fontSize: '0.7rem',
                            color: 'rgb(100, 100, 100)',
                            display: 'block',
                            marginBottom: '0.35rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>Due Date</label>
                          <span style={{
                            fontSize: '0.813rem',
                            fontWeight: '600',
                            color: 'rgb(50, 50, 50)',
                            display: 'block'
                          }}>
                            {formatUTCDate(selectedProject.due_date)}
                          </span>
                        </div>
                        <div>
                          <label style={{
                            fontSize: '0.7rem',
                            color: 'rgb(100, 100, 100)',
                            display: 'block',
                            marginBottom: '0.35rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>Duration</label>
                          <span style={{
                            fontSize: '0.813rem',
                            fontWeight: '600',
                            color: 'rgb(50, 50, 50)',
                            display: 'block'
                          }}>
                            {Math.ceil((new Date(selectedProject.due_date) - new Date(selectedProject.start_date || selectedProject.created_at)) / (1000 * 60 * 60 * 24))} days
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedProject.description && (
                      <div style={{
                        background: 'rgb(249, 250, 251)',
                        border: '1px solid rgb(229, 231, 235)',
                        borderRadius: '8px',
                        padding: '1rem'
                      }}>
                        <h4 style={{
                          fontSize: '0.875rem',
                          fontWeight: '700',
                          color: 'rgb(135, 35, 65)',
                          margin: '0 0 0.75rem 0',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}>
                          <FaFileAlt size={14} />
                          Description
                        </h4>
                        <p style={{
                          fontSize: '0.875rem',
                          color: 'rgb(75, 85, 99)',
                          margin: '0',
                          lineHeight: '1.6',
                          fontWeight: '400'
                        }}>
                          {selectedProject.description}
                        </p>
                        {selectedProject.rubric && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '0.75rem',
                            background: 'rgb(254, 249, 195)',
                            border: '1px solid rgb(253, 224, 71)',
                            borderRadius: '6px',
                            fontSize: '0.813rem',
                            color: 'rgb(113, 63, 18)',
                            lineHeight: '1.5'
                          }}>
                            <strong style={{ display: 'block', marginBottom: '0.25rem' }}>📋 Rubric:</strong> 
                            {selectedProject.rubric}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Requirements */}
                    <div style={{
                      background: 'rgb(249, 250, 251)',
                      border: '1px solid rgb(229, 231, 235)',
                      borderRadius: '8px',
                      padding: '1rem'
                    }}>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        color: 'rgb(135, 35, 65)',
                        margin: '0 0 0.75rem 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaTasks size={14} />
                        Requirements
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                        <div>
                          <label style={{
                            fontSize: '0.7rem',
                            color: 'rgb(100, 100, 100)',
                            display: 'block',
                            marginBottom: '0.35rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>File Types</label>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                            {(() => {
                              // Aggregate unique file types from project level and all phases
                              const allFileTypes = new Set();
                              
                              // Check project-level file types first
                              if (selectedProject?.file_types_allowed) {
                                try {
                                  const projectFileTypes = typeof selectedProject.file_types_allowed === 'string' 
                                    ? JSON.parse(selectedProject.file_types_allowed)
                                    : selectedProject.file_types_allowed;
                                  if (Array.isArray(projectFileTypes) && projectFileTypes.length > 0) {
                                    projectFileTypes.forEach(type => allFileTypes.add(type));
                                  }
                                } catch (e) {
                                  console.warn('Could not parse project file_types_allowed:', e);
                                }
                              }
                              
                              // Also check phase-level file types
                              if (detailedProject?.phases) {
                                detailedProject.phases.forEach(phase => {
                                  if (Array.isArray(phase.file_types_allowed) && phase.file_types_allowed.length > 0) {
                                    phase.file_types_allowed.forEach(type => allFileTypes.add(type));
                                  }
                                });
                              }
                              
                              const fileTypesArray = Array.from(allFileTypes);
                              
                              return fileTypesArray.length > 0 ? (
                                fileTypesArray.map(type => (
                                  <span key={type} style={{
                                    fontSize: '0.7rem',
                                    fontWeight: '600',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    background: 'rgb(224, 231, 255)',
                                    color: 'rgb(55, 48, 163)',
                                    display: 'inline-block'
                                  }}>{type}</span>
                                ))
                              ) : (
                                <span style={{ fontSize: '0.813rem', color: 'rgb(120, 120, 120)', fontStyle: 'italic' }}>All types allowed</span>
                              );
                            })()}
                          </div>
                        </div>
                        <div>
                          <label style={{
                            fontSize: '0.7rem',
                            color: 'rgb(100, 100, 100)',
                            display: 'block',
                            marginBottom: '0.35rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>Max File Size</label>
                          <span style={{
                            fontSize: '0.813rem',
                            fontWeight: '600',
                            color: 'rgb(50, 50, 50)',
                            display: 'block'
                          }}>
                            {selectedProject.max_file_size_mb || 10} MB
                          </span>
                        </div>
                        <div>
                          <label style={{
                            fontSize: '0.7rem',
                            color: 'rgb(100, 100, 100)',
                            display: 'block',
                            marginBottom: '0.35rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>Min Tasks/Member</label>
                          <span style={{
                            fontSize: '0.813rem',
                            fontWeight: '600',
                            color: 'rgb(50, 50, 50)',
                            display: 'block'
                          }}>
                            {selectedProject.min_tasks_per_member || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <label style={{
                            fontSize: '0.7rem',
                            color: 'rgb(100, 100, 100)',
                            display: 'block',
                            marginBottom: '0.35rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}>Max Tasks/Member</label>
                          <span style={{
                            fontSize: '0.813rem',
                            fontWeight: '600',
                            color: 'rgb(50, 50, 50)',
                            display: 'block'
                          }}>
                            {selectedProject.max_tasks_per_member || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Phases */}
                    <div style={{
                      background: 'rgb(249, 250, 251)',
                      border: '1px solid rgb(229, 231, 235)',
                      borderRadius: '8px',
                      padding: '1rem'
                    }}>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: '700',
                        color: 'rgb(135, 35, 65)',
                        margin: '0 0 0.75rem 0',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaProjectDiagram size={14} />
                        Phases
                      </h4>
                      
                      {detailedProject?.project_phases && detailedProject.project_phases.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {detailedProject.project_phases.map((phase, index) => {
                            const now = new Date();
                            const startDate = new Date(phase.start_date);
                            const endDate = new Date(phase.end_date);
                            let statusClass = 'completed';
                            let statusText = 'Completed';
                            let statusBg = 'rgb(220, 252, 231)';
                            let statusColor = 'rgb(22, 101, 52)';
                            
                            if (now < startDate) {
                              statusClass = 'upcoming';
                              statusText = 'Upcoming';
                              statusBg = 'rgb(224, 231, 255)';
                              statusColor = 'rgb(55, 48, 163)';
                            } else if (now >= startDate && now <= endDate) {
                              statusClass = 'active';
                              statusText = 'Active';
                              statusBg = 'rgb(254, 249, 195)';
                              statusColor = 'rgb(113, 63, 18)';
                            }
                            
                            return (
                              <div key={phase.id || index} style={{
                                border: '1px solid rgb(229, 231, 235)',
                                borderRadius: '8px',
                                overflow: 'hidden',
                                background: 'white'
                              }}>
                                <div 
                                  onClick={() => togglePhaseDropdown(index)}
                                  style={{
                                    padding: '0.75rem 1rem',
                                    background: 'rgb(249, 250, 251)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    transition: 'background 0.2s'
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgb(243, 244, 246)'}
                                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgb(249, 250, 251)'}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <span style={{
                                      fontSize: '0.75rem',
                                      fontWeight: '600',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '4px',
                                      background: 'rgb(135, 35, 65)',
                                      color: 'white'
                                    }}>
                                      Phase {phase.phase_number || index + 1}
                                    </span>
                                    <h5 style={{
                                      fontSize: '0.875rem',
                                      fontWeight: '600',
                                      color: 'rgb(50, 50, 50)',
                                      margin: 0
                                    }}>
                                      {phase.title || `Phase ${phase.phase_number || index + 1}`}
                                    </h5>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{
                                      fontSize: '0.625rem',
                                      fontWeight: '600',
                                      padding: '0.25rem 0.5rem',
                                      borderRadius: '9999px',
                                      background: statusBg,
                                      color: statusColor
                                    }}>
                                      {statusText}
                                    </span>
                                    <FaTasks size={14} style={{
                                      color: 'rgb(107, 114, 128)',
                                      transform: expandedPhases[index] ? 'rotate(90deg)' : 'rotate(0deg)',
                                      transition: 'transform 0.2s'
                                    }} />
                                  </div>
                                </div>
                                
                                {expandedPhases[index] && (
                                  <div style={{
                                    padding: '1rem',
                                    background: 'white',
                                    borderTop: '1px solid rgb(229, 231, 235)'
                                  }}>
                                    <div style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 1fr 1fr',
                                      gap: '0.75rem',
                                      marginBottom: '0.75rem'
                                    }}>
                                      <div>
                                        <label style={{
                                          fontSize: '0.7rem',
                                          color: 'rgb(120, 120, 120)',
                                          display: 'block',
                                          marginBottom: '0.25rem'
                                        }}>Start</label>
                                        <span style={{
                                          fontSize: '0.813rem',
                                          fontWeight: '500',
                                          color: 'rgb(50, 50, 50)'
                                        }}>
                                          {formatDateWithTime(phase.start_date)}
                                        </span>
                                      </div>
                                      <div>
                                        <label style={{
                                          fontSize: '0.7rem',
                                          color: 'rgb(120, 120, 120)',
                                          display: 'block',
                                          marginBottom: '0.25rem'
                                        }}>End</label>
                                        <span style={{
                                          fontSize: '0.813rem',
                                          fontWeight: '500',
                                          color: 'rgb(50, 50, 50)'
                                        }}>
                                          {formatDateWithTime(phase.end_date)}
                                        </span>
                                      </div>
                                      <div>
                                        <label style={{
                                          fontSize: '0.7rem',
                                          color: 'rgb(120, 120, 120)',
                                          display: 'block',
                                          marginBottom: '0.25rem'
                                        }}>Duration</label>
                                        <span style={{
                                          fontSize: '0.813rem',
                                          fontWeight: '500',
                                          color: 'rgb(50, 50, 50)'
                                        }}>
                                          {Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))} days
                                        </span>
                                      </div>
                                    </div>
                                    
                                    {phase.description && (
                                      <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{
                                          fontSize: '0.7rem',
                                          color: 'rgb(120, 120, 120)',
                                          display: 'block',
                                          marginBottom: '0.25rem',
                                          fontWeight: '600'
                                        }}>Description</label>
                                        <p style={{
                                          fontSize: '0.813rem',
                                          color: 'rgb(75, 85, 99)',
                                          margin: 0,
                                          lineHeight: '1.4'
                                        }}>
                                          {phase.description}
                                        </p>
                                      </div>
                                    )}
                                    
                                    <div style={{ marginBottom: '0.75rem' }}>
                                      <label style={{
                                        fontSize: '0.7rem',
                                        color: 'rgb(120, 120, 120)',
                                        display: 'block',
                                        marginBottom: '0.25rem',
                                        fontWeight: '600'
                                      }}>File Types</label>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                        {Array.isArray(phase.file_types_allowed) && phase.file_types_allowed.length > 0 ? (
                                          phase.file_types_allowed.map(type => (
                                            <span key={type} style={{
                                              fontSize: '0.7rem',
                                              fontWeight: '500',
                                              padding: '0.125rem 0.4rem',
                                              borderRadius: '4px',
                                              background: 'rgb(224, 231, 255)',
                                              color: 'rgb(55, 48, 163)'
                                            }}>{type}</span>
                                          ))
                                        ) : (
                                          <span style={{ fontSize: '0.813rem', color: 'rgb(150, 150, 150)' }}>All types allowed</span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {phase.evaluation_form_type && (
                                      <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{
                                          fontSize: '0.7rem',
                                          color: 'rgb(120, 120, 120)',
                                          display: 'block',
                                          marginBottom: '0.25rem',
                                          fontWeight: '600'
                                        }}>Evaluation</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                          <span style={{
                                            fontSize: '0.813rem',
                                            fontWeight: '500',
                                            padding: '0.25rem 0.5rem',
                                            borderRadius: '4px',
                                            background: 'rgb(243, 244, 246)',
                                            color: 'rgb(50, 50, 50)'
                                          }}>
                                            {phase.evaluation_form_type === 'custom' ? 'Custom Form' : 'Built-in Form'}
                                          </span>
                                          {phase.evaluation_form_file_url && (
                                            <a 
                                              href={phase.evaluation_form_file_url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              style={{
                                                fontSize: '0.75rem',
                                                color: 'rgb(135, 35, 65)',
                                                textDecoration: 'none',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                fontWeight: '500'
                                              }}
                                            >
                                              <FaFileAlt size={12} /> View
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                    
                                    {phase.rubric && (
                                      <div style={{ marginBottom: '0.75rem' }}>
                                        <label style={{
                                          fontSize: '0.7rem',
                                          color: 'rgb(120, 120, 120)',
                                          display: 'block',
                                          marginBottom: '0.25rem',
                                          fontWeight: '600'
                                        }}>Rubric</label>
                                        <p style={{
                                          fontSize: '0.813rem',
                                          color: 'rgb(75, 85, 99)',
                                          margin: '0 0 0.5rem 0',
                                          lineHeight: '1.4'
                                        }}>
                                          {phase.rubric}
                                        </p>
                                        {phase.rubric_file_url && (
                                          <a 
                                            href={phase.rubric_file_url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{
                                              fontSize: '0.75rem',
                                              color: 'rgb(135, 35, 65)',
                                              textDecoration: 'none',
                                              display: 'flex',
                                              alignItems: 'center',
                                              gap: '0.25rem',
                                              fontWeight: '500'
                                            }}
                                          >
                                            <FaFileAlt size={12} /> View Rubric
                                          </a>
                                        )}
                                      </div>
                                    )}
                                    
                                    {phase.max_attempts && (
                                      <div>
                                        <label style={{
                                          fontSize: '0.7rem',
                                          color: 'rgb(120, 120, 120)',
                                          display: 'block',
                                          marginBottom: '0.25rem',
                                          fontWeight: '600'
                                        }}>Max Attempts</label>
                                        <span style={{
                                          fontSize: '0.813rem',
                                          fontWeight: '500',
                                          padding: '0.25rem 0.5rem',
                                          borderRadius: '4px',
                                          background: 'rgb(243, 244, 246)',
                                          display: 'inline-block'
                                        }}>
                                          {phase.max_attempts}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{
                          textAlign: 'center',
                          padding: '2rem',
                          color: 'rgb(150, 150, 150)'
                        }}>
                          <FaProjectDiagram size={40} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                          <p style={{ fontSize: '0.875rem', margin: 0 }}>No phases defined yet</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'rgb(156, 163, 175)',
                textAlign: 'center',
                padding: '2rem'
              }}>
                <FaProjectDiagram size={64} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: 'rgb(107, 114, 128)',
                  margin: '0 0 0.5rem 0'
                }}>Select a Project</h3>
                <p style={{
                  fontSize: '0.875rem',
                  color: 'rgb(156, 163, 175)',
                  margin: 0
                }}>Choose a project from the list to view its details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderTasks() {
    return (
      <div className="tasks-content">
        <div className="content-header">
          <h3>Task Management</h3>
        </div>
        <div className="coming-soon">
          <FaTasks size={64} />
          <p>Task management feature coming soon</p>
        </div>
      </div>
    );
  }

  function renderGrading() {
    // Calculate statistics from actual submissions
    const calculateGradingStats = () => {
      const ungradedPhases = phaseSubmissions.filter(s => !s.grade || s.status === 'submitted').length;
      const gradedPhases = phaseSubmissions.filter(s => s.grade && s.status === 'graded').length;
      const ungradedProjects = projectSubmissions.filter(s => !s.grade || s.status === 'submitted').length;
      const gradedProjects = projectSubmissions.filter(s => s.grade && s.status === 'graded').length;
      
      return {
        totalUngraded: ungradedPhases + ungradedProjects,
        totalGraded: gradedPhases + gradedProjects,
        totalProjects: projects.length,
        totalPhaseSubmissions: phaseSubmissions.length,
        totalProjectSubmissions: projectSubmissions.length,
        totalSubmissions: phaseSubmissions.length + projectSubmissions.length
      };
    };
    
    const stats = calculateGradingStats();
    
    // Get all submissions (both project and phase) for the list
    const getAllSubmissions = () => {
      const submissions = [];
      
      console.log('📋 getAllSubmissions called with phaseSubmissions:', phaseSubmissions.length, 'projectSubmissions:', projectSubmissions.length);
      console.log('🔹 Sample phase submission:', phaseSubmissions[0]);
      
      // Add phase submissions
      phaseSubmissions.forEach(submission => {
        const project = projects.find(p => p.id === submission.projectId);
        
        // Use the data from backend which now includes phaseNumber, phaseTitle, and groupName
        const phaseNumber = submission.phaseNumber || 0;
        const phaseName = submission.phaseTitle || submission.phaseName || '';
        const groupName = submission.groupName || `Group ${submission.groupId || '?'}`;
        
        console.log('📋 Phase submission processed:', { phaseNumber, phaseName, groupName, submission_id: submission.id });
        
        submissions.push({
          id: submission.id,
          type: 'phase',
          projectId: submission.projectId,
          projectTitle: project?.title || 'Unknown Project',
          phaseId: submission.phaseId,
          phaseNumber: phaseNumber,
          phaseName: phaseName,
          groupId: submission.groupId,
          groupName: groupName,
          title: `${project?.title || 'Unknown'} - Phase ${phaseNumber}: ${phaseName}`,
          submissionData: submission,
          submittedBy: submission.submittedBy,
          submittedAt: submission.submittedAt,
          isGraded: !!submission.grade,
          grade: submission.grade,
          status: submission.status,
          ungradedCount: submission.grade ? 0 : 1,
          gradedCount: submission.grade ? 1 : 0,
          dueDate: submission.submittedAt || new Date(),
          description: ''
        });
      });
      
      // Add project submissions
      projectSubmissions.forEach(submission => {
        const project = projects.find(p => p.id === submission.projectId);
        const groupName = submission.groupName || `Group ${submission.groupId || '?'}`;
        
        submissions.push({
          id: submission.id,
          type: 'project',
          projectId: submission.projectId,
          projectTitle: project?.title || 'Unknown Project',
          groupName: groupName,
          title: `${project?.title || 'Unknown'} - Final Project`,
          submissionData: submission,
          groupId: submission.groupId,
          submittedBy: submission.submittedBy,
          submittedAt: submission.submittedAt,
          isGraded: !!submission.grade,
          grade: submission.grade,
          status: submission.status,
          ungradedCount: submission.grade ? 0 : 1,
          gradedCount: submission.grade ? 1 : 0,
          dueDate: project?.due_date || new Date(),
          description: project?.description || ''
        });
      });
      
      return submissions;
    };
    
    // Filter submissions based on filter type
    const allSubmissions = getAllSubmissions();
    const filteredSubmissions = allSubmissions.filter(submission => {
      if (gradingFilterType === 'projects') return submission.type === 'project';
      if (gradingFilterType === 'phases') return submission.type === 'phase';
      return true; // 'all'
    });
    
    // Sort submissions based on sort option
    const sortedSubmissions = [...filteredSubmissions].sort((a, b) => {
      if (gradingSortOption === 'ungraded') {
        // Ungraded first
        if (a.isGraded && !b.isGraded) return 1;
        if (!a.isGraded && b.isGraded) return -1;
        return new Date(b.submittedAt) - new Date(a.submittedAt);
      } else if (gradingSortOption === 'recent') {
        return new Date(b.submittedAt) - new Date(a.submittedAt);
      } else if (gradingSortOption === 'alphabetical') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });
    
    // Handle opening grading modal
    const handleGradeSubmission = (submission) => {
      setSelectedSubmissionToGrade(submission);
      setGradeValue(submission.submissionData.grade || '');
      setFeedback(submission.submissionData.instructor_feedback || '');
      setShowGradingModal(true);
    };

    
    // If a submission is selected, show the detail view
    if (selectedGradingSubmission) {
      // For now, redirect to the grade submissions view
      // This could be expanded to show individual student submissions in the future
      return (
        <div className="grading-redesign-container">
          {/* Breadcrumb Navigation */}
          <div className="grading-breadcrumb-nav">
            <button 
              className="breadcrumb-back-btn"
              onClick={() => setSelectedGradingSubmission(null)}
            >
              <FaArrowLeft />
              Back to Dashboard
            </button>
            <div className="breadcrumb-path">
              <span className="breadcrumb-item">Grading</span>
              <span className="breadcrumb-separator">›</span>
              <span className="breadcrumb-current">{selectedGradingSubmission.title}</span>
            </div>
          </div>

          {/* Submission Detail Header */}
          <div className="submission-detail-header">
            <div className="detail-header-badge" data-type={selectedGradingSubmission.type}>
              {selectedGradingSubmission.type === 'project' ? (
                <FaProjectDiagram size={32} />
              ) : (
                <FaLayerGroup size={32} />
              )}
            </div>
            <div className="detail-header-content">
              <h1>{selectedGradingSubmission.title}</h1>
              <div className="detail-header-meta">
                <span>
                  <FaClock /> Due: {new Date(selectedGradingSubmission.dueDate).toLocaleDateString()}
                </span>
                <span className="meta-divider">•</span>
                <span>
                  <FaCheckCircle /> {selectedGradingSubmission.gradedCount} graded
                </span>
                {selectedGradingSubmission.ungradedCount > 0 && (
                  <>
                    <span className="meta-divider">•</span>
                    <span className="ungraded-text">
                      <FaExclamationCircle /> {selectedGradingSubmission.ungradedCount} pending
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Message to view submissions */}
          <div className="submission-detail-message">
            <FaGraduationCap size={64} />
            <h2>Individual Submission Grading</h2>
            <p>
              This section will display individual student/group submissions for grading.
              You can review submissions, provide feedback, and assign grades here.
            </p>
            <button 
              className="redirect-grade-btn"
              onClick={() => {
                // Find the project and set it for grading
                const project = projects.find(p => p.id === selectedGradingSubmission.projectId);
                if (project) {
                  setSelectedProjectForGrading(project);
                  setActiveTab('grade-submissions');
                }
              }}
            >
              <FaEye />
              Go to Grade Submissions
            </button>
          </div>
        </div>
      );
    }
    
    // NEW GRADING INTERFACE - Main View
    return (
      <div className="grading-redesign-container">
        {/* Header */}
        <div className="grading-redesign-header">
          <h1>Grading Dashboard</h1>
          <p>Manage and review all submissions</p>
        </div>

        {/* Statistics Cards */}
        <div className="grading-stats-grid">
          <div className="grading-stat-card ungraded">
            <div className="stat-icon">
              <FaExclamationCircle />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalUngraded}</div>
              <div className="stat-label">Ungraded Submissions</div>
            </div>
          </div>

          <div className="grading-stat-card graded">
            <div className="stat-icon">
              <FaCheckCircle />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalGraded}</div>
              <div className="stat-label">Graded Submissions</div>
            </div>
          </div>

          <div className="grading-stat-card projects">
            <div className="stat-icon">
              <FaProjectDiagram />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalProjects}</div>
              <div className="stat-label">Active Projects</div>
            </div>
          </div>

          <div className="grading-stat-card phases">
            <div className="stat-icon">
              <FaLayerGroup />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalPhaseSubmissions}</div>
              <div className="stat-label">Phase Submissions</div>
            </div>
          </div>
        </div>

        {/* Filters and Sort */}
        <div className="grading-controls">
          <div className="grading-filter-tabs">
            <button
              className={`filter-tab ${gradingFilterType === 'all' ? 'active' : ''}`}
              onClick={() => setGradingFilterType('all')}
            >
              <FaThList />
              <span>All Submissions</span>
            </button>
            <button
              className={`filter-tab ${gradingFilterType === 'projects' ? 'active' : ''}`}
              onClick={() => setGradingFilterType('projects')}
            >
              <FaProjectDiagram />
              <span>Projects Only</span>
            </button>
            <button
              className={`filter-tab ${gradingFilterType === 'phases' ? 'active' : ''}`}
              onClick={() => setGradingFilterType('phases')}
            >
              <FaLayerGroup />
              <span>Phases Only</span>
            </button>
          </div>

          <div className="grading-sort-dropdown">
            <label>Sort by:</label>
            <select
              value={gradingSortOption}
              onChange={(e) => setGradingSortOption(e.target.value)}
            >
              <option value="ungraded">Most Ungraded</option>
              <option value="recent">Most Recent</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Submissions List */}
        <div className="grading-submissions-list">
          {loadingSubmissions ? (
            <div className="no-submissions-message">
              <FaSpinner size={64} className="spinning" />
              <h3>Loading submissions...</h3>
              <p>Please wait while we fetch the submissions</p>
            </div>
          ) : sortedSubmissions.length > 0 ? (
            sortedSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="grading-submission-card"
                onClick={() => handleGradeSubmission(submission)}
              >
                <div className="submission-card-header">
                  <div className="submission-type-badge" data-type={submission.type}>
                    {submission.type === 'project' ? (
                      <>
                        <FaProjectDiagram />
                        <span>Project</span>
                      </>
                    ) : (
                      <>
                        <FaLayerGroup />
                        <span>Phase {submission.phaseNumber}</span>
                      </>
                    )}
                  </div>
                  <div className="submission-ungraded-badge">
                    {submission.ungradedCount > 0 && (
                      <div className="ungraded-count">
                        <FaExclamationCircle />
                        <span>{submission.ungradedCount} ungraded</span>
                      </div>
                    )}
                  </div>
                </div>

                <h3 className="submission-title">
                  {submission.type === 'phase' 
                    ? `Phase ${submission.phaseNumber} ${submission.phaseName ? `(${submission.phaseName})` : ''} - ${submission.groupName} - Submission`
                    : submission.title
                  }
                </h3>
                
                <div className="submission-meta">
                  <div className="submission-due">
                    <FaClock />
                    <span>Due: {new Date(submission.dueDate).toLocaleDateString()}</span>
                  </div>
                  <div className="submission-counts">
                    <span className="count-graded">✓ {submission.gradedCount} graded</span>
                    {submission.ungradedCount > 0 && (
                      <span className="count-ungraded">! {submission.ungradedCount} pending</span>
                    )}
                  </div>
                </div>

                <div className="submission-progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${submission.gradedCount + submission.ungradedCount > 0
                        ? (submission.gradedCount / (submission.gradedCount + submission.ungradedCount)) * 100
                        : 0}%`
                    }}
                  ></div>
                </div>

                <button className="view-submissions-btn">
                  <FaEye />
                  View & Grade Submissions
                </button>
              </div>
            ))
          ) : (
            <div className="no-submissions-message">
              <FaInbox size={64} />
              <h3>No submissions found</h3>
              <p>
                {gradingFilterType === 'projects' && 'No project submissions to grade'}
                {gradingFilterType === 'phases' && 'No phase submissions to grade'}
                {gradingFilterType === 'all' && 'No submissions available yet'}
              </p>
            </div>
          )}
        </div>
        
        {/* Grading Modal */}
        {showGradingModal && selectedSubmissionToGrade && renderGradingModal()}
      </div>
    );
  }
  
  // Grading Modal Component
  function renderGradingModal() {
    if (!selectedSubmissionToGrade) return null;
    
    const submission = selectedSubmissionToGrade.submissionData;
    
    const handleSaveGrade = async () => {
      setSavingGrade(true);
      try {
        const token = localStorage.getItem('token');
        const submissionId = selectedSubmissionToGrade.id || selectedSubmissionToGrade.attempts?.[0]?.submissionId;
        
        if (!submissionId) {
          throw new Error('Submission ID not found');
        }
        
        const endpoint = selectedSubmissionToGrade.type === 'phase' || selectedSubmissionToGrade.submissionType === 'phase'
          ? `${apiConfig.baseURL}/api/grade-submissions/phase-submissions/${submissionId}/grade`
          : `${apiConfig.baseURL}/api/grade-submissions/project-submissions/${submissionId}/grade`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            grade: parseFloat(gradeValue),
            feedback: feedback
          })
        });
        
        if (response.ok) {
          setNotifications(prev => [...prev, {
            id: Date.now(),
            type: 'success',
            message: 'Grade saved successfully!',
            timestamp: new Date()
          }]);
          
          // Trigger a refresh by toggling the loading state
          // The component will re-render and fetch fresh data
          setShowGradingModal(false);
          setSelectedSubmissionToGrade(null);
          setGradeValue('');
          setFeedback('');
          
          // Update the submission in the local state to reflect the grade
          if (gradeSubmissionsView.detailsData) {
            setGradeSubmissionsView(prev => ({
              ...prev,
              detailsData: prev.detailsData.map(item => 
                item.id === submissionId 
                  ? { ...item, grade: parseFloat(gradeValue), gradedAt: new Date().toISOString(), status: 'graded' }
                  : item
              )
            }));
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to save grade');
        }
      } catch (error) {
        console.error('Error saving grade:', error);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          message: error.message || 'Failed to save grade. Please try again.',
          timestamp: new Date()
        }]);
      } finally {
        setSavingGrade(false);
      }
    };
    
    return (
      <div className="modal-overlay" onClick={() => !savingGrade && setShowGradingModal(false)}>
        <div className="grading-modal" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="grading-modal-header">
            <div>
              <h2>{selectedSubmissionToGrade.title}</h2>
              <p className="modal-subtitle">
                {selectedSubmissionToGrade.type === 'phase' ? 'Phase Deliverable' : 'Project Deliverable'} Submission
              </p>
            </div>
            <button 
              className="modal-close-btn"
              onClick={() => setShowGradingModal(false)}
              disabled={savingGrade}
            >
              <FaTimes />
            </button>
          </div>
          
          {/* Modal Body */}
          <div className="grading-modal-body">
            {/* Submission Info */}
            <div className="grading-section">
              <h3><FaFileAlt /> Submission Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Submitted By:</label>
                  <span>{submission.submitted_by || 'Unknown'}</span>
                </div>
                <div className="info-item">
                  <label>Submitted At:</label>
                  <span>{new Date(submission.submitted_at).toLocaleString()}</span>
                </div>
                <div className="info-item">
                  <label>Status:</label>
                  <span className={`status-badge ${submission.status}`}>
                    {submission.status || 'submitted'}
                  </span>
                </div>
                <div className="info-item">
                  <label>Max Grade:</label>
                  <span>{submission.max_grade || 100}</span>
                </div>
              </div>
            </div>
            
            {/* Files */}
            <div className="grading-section">
              <h3><FaPaperclip /> Submitted Files</h3>
              <div className="files-list">
                {submission.files && submission.files.length > 0 ? (
                  submission.files.map((file, index) => (
                    <div key={index} className="file-item">
                      <FaFile />
                      <span className="file-name">{file.name || 'Unnamed file'}</span>
                      <a 
                        href={file.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="file-download-btn"
                      >
                        <FaDownload /> Download
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No files uploaded</p>
                )}
              </div>
            </div>
            
            {/* Member Tasks */}
            <div className="grading-section">
              <h3><FaTasks /> Member Tasks</h3>
              <div className="member-tasks-list">
                {submission.member_tasks && submission.member_tasks.length > 0 ? (
                  submission.member_tasks.map((member, idx) => (
                    <div key={idx} className="member-task-card">
                      <div className="member-header">
                        <strong>{member.member_name}</strong>
                        <span className="role-badge">{member.role === 'leader' ? 'Leader' : 'Member'}</span>
                      </div>
                      <p className="task-count">
                        {member.task_count || member.tasks?.length || 0} task(s) assigned
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No member task information</p>
                )}
              </div>
            </div>
            
            {/* Member Inclusions */}
            <div className="grading-section">
              <h3><FaUsers /> Member Inclusions</h3>
              <div className="inclusions-list">
                {submission.member_inclusions && submission.member_inclusions.length > 0 ? (
                  submission.member_inclusions.map((member, idx) => (
                    <div key={idx} className={`inclusion-item ${member.included ? 'included' : 'excluded'}`}>
                      <div className="inclusion-header">
                        <span>{member.member_name}</span>
                        {member.included ? (
                          <span className="inclusion-badge included">✓ Included</span>
                        ) : (
                          <span className="inclusion-badge excluded">✗ Excluded</span>
                        )}
                      </div>
                      {!member.included && member.exclusion_reason && (
                        <p className="exclusion-reason">
                          <strong>Reason:</strong> {member.exclusion_reason}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="no-data">No member inclusion information</p>
                )}
              </div>
            </div>
            
            {/* Validation Results */}
            {submission.validation_results && (
              <div className="grading-section">
                <h3><FaCheckCircle /> Validation Results</h3>
                <div className="validation-info">
                  {submission.validation_results.evaluation_warnings && 
                   submission.validation_results.evaluation_warnings.length > 0 && (
                    <div className="validation-warnings">
                      {submission.validation_results.evaluation_warnings.map((warning, idx) => (
                        <div key={idx} className="warning-item">
                          <span className="warning-icon">{warning.icon}</span>
                          <span>{warning.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Grading Section */}
            <div className="grading-section grading-input-section">
              <h3><FaGraduationCap /> Assign Grade</h3>
              <div className="grade-input-container">
                <div className="input-group">
                  <label>Grade (out of {submission.max_grade || 100}):</label>
                  <input
                    type="number"
                    min="0"
                    max={submission.max_grade || 100}
                    value={gradeValue}
                    onChange={(e) => setGradeValue(e.target.value)}
                    placeholder="Enter grade"
                    className="grade-input"
                  />
                </div>
                <div className="input-group">
                  <label>Instructor Feedback:</label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback for the group..."
                    rows={5}
                    className="feedback-textarea"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Modal Footer */}
          <div className="grading-modal-footer">
            <button 
              className="cancel-btn"
              onClick={() => setShowGradingModal(false)}
              disabled={savingGrade}
            >
              Cancel
            </button>
            <button 
              className="save-grade-btn"
              onClick={handleSaveGrade}
              disabled={savingGrade || !gradeValue}
            >
              {savingGrade ? (
                <>
                  <FaSpinner className="spinning" />
                  Saving...
                </>
              ) : (
                <>
                  <FaCheckCircle />
                  Save Grade
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function renderProjectGrading() {
    return (
      <div className="integrated-grading">
        <div className="grading-breadcrumb-no-bg">
          <span className="breadcrumb-item" onClick={() => setGradingProject(null)}>
            Project grading
          </span>
          <span className="breadcrumb-separator">&gt;</span>
          <span className="breadcrumb-current">
            {gradingProject.title} Submissions
          </span>
        </div>
        
        <div className={`grading-content-floating ${gradingSidebarCollapsed ? 'wide' : ''}`}>
          <div className="grading-header">
            <div className="header-left">
              <h3>Submissions</h3>
            </div>
            <div className="header-actions">
              <select className="sort-dropdown">
                <option value="due-date">Due Date First</option>
                <option value="title">Title A-Z</option>
                <option value="submissions">Most Submissions</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
          <div className="grading-layout">
            <div className={`grading-sidebar ${gradingSidebarCollapsed ? 'collapsed' : ''}`}>
              <div className="grading-nav">
                <button 
                  className={`grading-nav-btn ${activeSubmissionType === 'project' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSubmissionType('project');
                    setGradingSidebarCollapsed(!gradingSidebarCollapsed);
                  }}
                >
                  <FaFileAlt size={16} />
                  <span className={gradingSidebarCollapsed ? 'hidden' : ''}>Project Submissions</span>
                </button>
                <button 
                  className={`grading-nav-btn ${activeSubmissionType === 'phase' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveSubmissionType('phase');
                    setGradingSidebarCollapsed(!gradingSidebarCollapsed);
                  }}
                >
                  <FaTasks size={16} />
                  <span className={gradingSidebarCollapsed ? 'hidden' : ''}>Phase Submissions</span>
                </button>
              </div>
            </div>
            
            <div className="grading-main">
              <div className="submissions-list-compact">
                {activeSubmissionType === 'project' ? (
                  submissions.projectSubmissions.length > 0 ? (
                    submissions.projectSubmissions.map((submission) => (
                      <div key={submission.id} className="submission-item-compact" onClick={() => setSelectedSubmission(submission)}>
                        <div className="submission-info-compact">
                          <div className="submission-title-compact">
                            {submission.course_groups?.group_name || `Group ${submission.course_groups?.group_number}`}
                          </div>
                          <div className="submission-meta-compact">
                            <span className="submission-date-compact">
                              {new Date(submission.submission_date).toLocaleDateString()}
                            </span>
                            <span className={`submission-status-compact ${submission.grade ? 'graded' : 'pending'}`}>
                              {submission.grade ? 'Graded' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <button className="btn btn-primary btn-sm">
                          <FaGraduationCap size={14} />
                          Grade
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="no-submissions">
                      <p>No project submissions yet</p>
                    </div>
                  )
                ) : (
                  submissions.phaseSubmissions.length > 0 ? (
                    submissions.phaseSubmissions.map((submission) => (
                      <div key={submission.id} className="submission-item-compact" onClick={() => setSelectedSubmission(submission)}>
                        <div className="submission-info-compact">
                          <div className="submission-title-compact">
                            {submission.course_groups?.group_name || `Group ${submission.course_groups?.group_number}`} - {submission.project_phases?.title}
                          </div>
                          <div className="submission-meta-compact">
                            <span className="submission-date-compact">
                              {new Date(submission.submission_date).toLocaleDateString()}
                            </span>
                            <span className={`submission-status-compact ${submission.grade ? 'graded' : 'pending'}`}>
                              {submission.grade ? 'Graded' : 'Pending'}
                            </span>
                          </div>
                        </div>
                        <button className="btn btn-primary btn-sm">
                          <FaGraduationCap size={14} />
                          Grade
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="no-submissions">
                      <p>No phase submissions yet</p>
                    </div>
                  )
                )}
              </div>
            </div>
            
            <div className="grading-details">
              {selectedSubmission ? (
                <div className="submission-details">
                  <div className="details-header">
                    <h4>
                      {activeSubmissionType === 'project' 
                        ? `${selectedSubmission.course_groups?.group_name || `Group ${selectedSubmission.course_groups?.group_number}`} - Project Submission`
                        : `${selectedSubmission.course_groups?.group_name || `Group ${selectedSubmission.course_groups?.group_number}`} - ${selectedSubmission.project_phases?.title}`
                      }
                    </h4>
                    <span className={`status-badge ${selectedSubmission.grade ? 'graded' : 'pending'}`}>
                      {selectedSubmission.grade ? 'Graded' : 'Pending Review'}
                    </span>
                  </div>
                  
                  <div className="details-content">
                    <div className="detail-section">
                      <h5>Submitted Files</h5>
                      <div className="file-list">
                        <div className="file-item">
                          <FaFileAlt size={16} />
                          <span>website.html</span>
                          <button className="btn-download">
                            <FaEye size={14} />
                          </button>
                        </div>
                        <div className="file-item">
                          <FaFileAlt size={16} />
                          <span>styles.css</span>
                          <button className="btn-download">
                            <FaEye size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="detail-section">
                      <h5>Submission Notes</h5>
                      <p>Complete website with responsive design and database integration.</p>
                    </div>
                    
                    <div className="detail-section">
                      <h5>Grading</h5>
                      <div className="grade-input">
                        <label>Score (0-100)</label>
                        <input type="number" min="0" max="100" placeholder="Enter score" />
                      </div>
                      <div className="grade-comments">
                        <label>Comments</label>
                        <textarea placeholder="Add grading comments..." rows="3"></textarea>
                      </div>
                      <button className="btn btn-primary">Submit Grade</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="no-selection">
                  <FaGraduationCap size={48} />
                  <p>Select a submission to view details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderJoinRequests() {
    const pendingRequests = joinRequests.filter(request => request.status === 'pending');
    const processedRequests = joinRequests.filter(request => request.status !== 'pending');

    const handleJoinRequest = async (requestId, action) => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/professor/course/${courseId}/join-requests/${requestId}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ action })
          }
        );

        if (response.ok) {
          fetchCourseData(); // Refresh data
        }
      } catch (error) {
        console.error('Error processing join request:', error);
      }
    };

    return (
      <div style={{ padding: '2rem', width: '100%', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '100%' }}>
          {/* Main Container */}
          <div style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '700px'
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

            {/* Header */}
            <div style={{
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <h3 style={{
                color: 'rgb(135, 35, 65)',
                fontWeight: '700',
                margin: '0px',
                fontSize: '1.1rem'
              }}>Join Requests ({joinRequests.length})</h3>
            </div>

            {/* Content */}
            <div style={{
              padding: '1.5rem',
              flex: '1 1 0%',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem'
            }}>
              {pendingRequests.length > 0 && (
                <div>
                  <div style={{
                    padding: '0 0 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: '700',
                      color: 'white',
                      margin: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FaClock size={18} />
                      Pending Requests ({pendingRequests.length})
                    </h3>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                    gap: '1rem'
                  }}>
                    {pendingRequests.map(request => (
                      <div 
                        key={request.id}
                        style={{
                          background: 'rgb(255, 255, 255)',
                          borderRadius: '0px',
                          border: 'none',
                          boxShadow: 'rgba(0, 0, 0, 0.15) 0px 2px 6px',
                          overflow: 'hidden',
                          transition: 'all 0.2s ease',
                          cursor: 'default'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.25)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0px 2px 6px rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.transform = 'translateY(0px)';
                        }}
                      >
                        <div style={{
                          padding: '1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          borderBottom: '1px solid rgb(240, 240, 240)'
                        }}>
                          <div style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '50%',
                            background: 'rgb(135, 35, 65)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <FaUser size={24} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h4 style={{
                              fontSize: '1rem',
                              fontWeight: '600',
                              color: 'rgb(50, 50, 50)',
                              margin: '0 0 0.25rem 0'
                            }}>
                              {request.student_first_name} {request.student_last_name}
                            </h4>
                            <p style={{
                              fontSize: '0.75rem',
                              color: 'rgb(120, 120, 120)',
                              margin: '0',
                              fontWeight: '500'
                            }}>
                              ID: {request.student_number}
                            </p>
                          </div>
                          <div style={{
                            fontSize: '0.625rem',
                            fontWeight: '600',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '4px',
                            background: 'rgb(255, 152, 0)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            textTransform: 'uppercase'
                          }}>
                            <FaClock size={12} />
                            Pending
                          </div>
                        </div>
                        
                        <div style={{
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.813rem',
                            color: 'rgb(80, 80, 80)'
                          }}>
                            <FaEnvelope size={14} style={{ color: 'rgb(135, 35, 65)', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {request.student_email}
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.813rem',
                            color: 'rgb(80, 80, 80)'
                          }}>
                            <FaCalendarAlt size={14} style={{ color: 'rgb(135, 35, 65)', flexShrink: 0 }} />
                            <span>
                              Requested: {new Date(request.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            fontSize: '0.813rem',
                            color: 'rgb(80, 80, 80)'
                          }}>
                            <FaTag size={14} style={{ color: 'rgb(135, 35, 65)', flexShrink: 0 }} />
                            <span>Code: {request.join_code_used}</span>
                          </div>
                        </div>

                        <div style={{
                          padding: '1rem 1.25rem',
                          display: 'flex',
                          gap: '0.75rem',
                          borderTop: '1px solid rgb(240, 240, 240)'
                        }}>
                          <button 
                            onClick={() => handleJoinRequest(request.id, 'approve')}
                            style={{
                              flex: 1,
                              padding: '0.65rem 1rem',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'rgb(76, 175, 80)',
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '0.813rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgb(56, 142, 60)'}
                            onMouseLeave={(e) => e.target.style.background = 'rgb(76, 175, 80)'}
                          >
                            <FaCheckCircle size={16} />
                            Approve
                          </button>
                          <button 
                            onClick={() => handleJoinRequest(request.id, 'reject')}
                            style={{
                              flex: 1,
                              padding: '0.65rem 1rem',
                              borderRadius: '6px',
                              border: 'none',
                              background: 'rgb(244, 67, 54)',
                              color: 'white',
                              fontWeight: '600',
                              fontSize: '0.813rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgb(211, 47, 47)'}
                            onMouseLeave={(e) => e.target.style.background = 'rgb(244, 67, 54)'}
                          >
                            <FaTrash size={16} />
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {processedRequests.length > 0 && (
                <div>
                  <div style={{
                    padding: '0 0 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: '700',
                      color: 'white',
                      margin: '0',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FaCheckCircle size={18} />
                      Recent Decisions ({processedRequests.length})
                    </h3>
                  </div>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    {processedRequests.slice(0, 10).map(request => (
                      <div 
                        key={request.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '1rem',
                          padding: '0.875rem 1rem',
                          borderRadius: '0px',
                          background: 'rgb(255, 255, 255)',
                          border: 'none',
                          boxShadow: 'rgba(0, 0, 0, 0.15) 0px 2px 6px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.25)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = '0px 2px 6px rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.transform = 'translateY(0px)';
                        }}
                      >
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: request.status === 'approved' ? 'rgb(76, 175, 80)' : 'rgb(244, 67, 54)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          <FaUser size={16} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h5 style={{
                            fontSize: '0.875rem',
                            fontWeight: '600',
                            color: 'rgb(50, 50, 50)',
                            margin: '0 0 0.25rem 0'
                          }}>
                            {request.student_first_name} {request.student_last_name}
                          </h5>
                          <p style={{
                            fontSize: '0.75rem',
                            color: 'rgb(120, 120, 120)',
                            margin: '0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {request.student_email}
                          </p>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem'
                        }}>
                          <span style={{
                            fontSize: '0.625rem',
                            fontWeight: '600',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '4px',
                            background: request.status === 'approved' ? 'rgb(220, 252, 231)' : 'rgb(254, 226, 226)',
                            color: request.status === 'approved' ? 'rgb(22, 101, 52)' : 'rgb(153, 27, 27)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            textTransform: 'uppercase'
                          }}>
                            {request.status === 'approved' ? <FaCheckCircle size={12} /> : <FaTrash size={12} />}
                            {request.status.toUpperCase()}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            color: 'rgb(120, 120, 120)',
                            fontWeight: '500'
                          }}>
                            {new Date(request.responded_at || request.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {joinRequests.length === 0 && (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '3rem 2rem',
                  textAlign: 'center',
                  color: 'white'
                }}>
                  <FaUserPlus size={64} style={{ color: 'rgba(255, 255, 255, 0.3)', marginBottom: '1rem' }} />
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: '600',
                    margin: '0 0 0.5rem 0',
                    color: 'white'
                  }}>
                    No Join Requests
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: 'rgba(255, 255, 255, 0.7)',
                    margin: '0',
                    maxWidth: '400px'
                  }}>
                    When students request to join your course, they'll appear here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderAnnouncements() {
    // Filter announcements
    const filteredAnnouncements = announcements.filter(announcement => {
      const matchesSearch = announcement.title.toLowerCase().includes(announcementSearchQuery.toLowerCase()) ||
                           announcement.content.toLowerCase().includes(announcementSearchQuery.toLowerCase());
      
      if (announcementFilter === 'all') return matchesSearch;
      if (announcementFilter === 'recent') {
        const announcementDate = new Date(announcement.created_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return matchesSearch && announcementDate >= weekAgo;
      }
      if (announcementFilter === 'important') {
        return matchesSearch && announcement.type === 'important';
      }
      return matchesSearch;
    });

    const handleAnnouncementSelection = (announcement) => {
      setSelectedAnnouncement(announcement);
      setShowAllComments(false); // Reset comment view when selecting new announcement
    };

    const handleCreateAnnouncement = () => {
      setEditingAnnouncement(null);
      setShowAnnouncementModal(true);
    };

    const handleEditAnnouncement = (announcement) => {
      setEditingAnnouncement(announcement);
      setShowAnnouncementModal(true);
    };

    const handleSaveAnnouncement = async (announcementData) => {
      try {
        const url = editingAnnouncement 
          ? `/api/announcements/${editingAnnouncement.id}`
          : '/api/announcements';
        
        const method = editingAnnouncement ? 'PUT' : 'POST';
        
        let payload;
        let headers = {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        };

        if (editingAnnouncement) {
          // For editing, convert FormData to JSON (no files for editing)
          const jsonData = {
            title: announcementData.get('title'),
            content: announcementData.get('content'),
            type: announcementData.get('type'),
            is_active: true
          };
          payload = JSON.stringify(jsonData);
          headers['Content-Type'] = 'application/json';
        } else {
          // For creating, send FormData with files
          payload = announcementData;
          
          // Debug logging
          console.log('🔍 Course object:', course);
          console.log('🔍 Course ID:', course?.id);
          console.log('🔍 Professor ID:', course?.professor_id);
          
          payload.append('course_id', course.id);
          payload.append('created_by', course.professor_id);
        }

        const response = await fetch(url, {
          method,
          headers,
          body: payload
        });

        if (response.ok) {
          const updatedAnnouncement = await response.json();
          if (editingAnnouncement) {
            setAnnouncements(prev => prev.map(a => a.id === updatedAnnouncement.id ? updatedAnnouncement : a));
            setSelectedAnnouncement(updatedAnnouncement);
          } else {
            setAnnouncements(prev => [updatedAnnouncement, ...prev]);
            setSelectedAnnouncement(updatedAnnouncement);
          }
          setShowAnnouncementModal(false);
          setEditingAnnouncement(null);
        }
      } catch (error) {
        console.error('Error saving announcement:', error);
      }
    };

    const handleDeleteAnnouncement = async (announcementId) => {
      if (!window.confirm('Are you sure you want to delete this announcement?')) {
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/announcements/${announcementId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
          if (selectedAnnouncement?.id === announcementId) {
            setSelectedAnnouncement(null);
          }
          alert('Announcement deleted successfully');
        } else {
          const error = await response.json();
          alert(`Failed to delete announcement: ${error.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error deleting announcement:', error);
        alert('Error deleting announcement');
      }
    };

    // Comment handlers
    const handleAddComment = async (commentData) => {
      try {
        const response = await fetch(`/api/announcements/${selectedAnnouncement.id}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            ...commentData,
            user_id: course.professor_id,
            user_type: 'professor'
          })
        });

        if (response.ok) {
          const newComment = await response.json();
          // Add user data to the new comment to match backend structure
          const commentWithUserData = {
            ...newComment,
            user: {
              first_name: course.professoraccounts?.first_name,
              last_name: course.professoraccounts?.last_name,
              profile_image_url: course.professoraccounts?.profile_image_url
            }
          };
          
          setAnnouncements(prev => prev.map(a => 
            a.id === selectedAnnouncement.id 
              ? { ...a, announcement_comments: [...(a.announcement_comments || []), commentWithUserData] }
              : a
          ));
          setSelectedAnnouncement(prev => ({
            ...prev,
            announcement_comments: [...(prev.announcement_comments || []), commentWithUserData]
          }));
        }
      } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
      }
    };

    const handleUpdateComment = async (commentId, content) => {
      try {
        const response = await fetch(`/api/announcements/comments/${commentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ content })
        });

        if (response.ok) {
          const updatedComment = await response.json();
          setAnnouncements(prev => prev.map(a => 
            a.id === selectedAnnouncement.id 
              ? { 
                  ...a, 
                  announcement_comments: a.announcement_comments.map(c => 
                    c.id === commentId ? updatedComment : c
                  )
                }
              : a
          ));
          setSelectedAnnouncement(prev => ({
            ...prev,
            announcement_comments: prev.announcement_comments.map(c => 
              c.id === commentId ? updatedComment : c
            )
          }));
        }
      } catch (error) {
        console.error('Error updating comment:', error);
        throw error;
      }
    };

    const handleDeleteComment = async (commentId) => {
      try {
        const response = await fetch(`/api/announcements/comments/${commentId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          setAnnouncements(prev => prev.map(a => 
            a.id === selectedAnnouncement.id 
              ? { 
                  ...a, 
                  announcement_comments: a.announcement_comments.filter(c => c.id !== commentId)
                }
              : a
          ));
          setSelectedAnnouncement(prev => ({
            ...prev,
            announcement_comments: prev.announcement_comments.filter(c => c.id !== commentId)
          }));
        }
      } catch (error) {
        console.error('Error deleting comment:', error);
        throw error;
      }
    };

    return (
      <div style={{ padding: '2rem', width: '100%', margin: '0 auto' }}>
        {/* Create Announcement Button */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            onClick={handleCreateAnnouncement}
            style={{
              padding: '0.6rem 1.5rem',
              borderRadius: '6px',
              border: 'none',
              background: 'rgb(135, 35, 65)',
              color: 'white',
              fontWeight: '600',
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(135, 35, 65, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgb(110, 25, 50)'}
            onMouseLeave={(e) => e.target.style.background = 'rgb(135, 35, 65)'}
          >
            <FaBullhorn size={16} />
            Create New Announcement
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', maxWidth: '100%' }}>
          {/* Left Side - Announcement List Card */}
          <div style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '700px',
            minHeight: '700px',
            maxHeight: '700px'
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

            {/* Header */}
            <div style={{
              padding: '1.5rem 1.5rem 1rem',
              borderBottom: '2px solid rgb(135, 35, 65)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <h3 style={{
                color: 'rgb(135, 35, 65)',
                fontWeight: '700',
                margin: '0px',
                fontSize: '1.1rem'
              }}>Announcements ({filteredAnnouncements.length})</h3>
            </div>

            {/* Filter Tabs */}
            <div style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'rgb(255, 255, 255)',
              display: 'flex',
              gap: '0.5rem'
            }}>
              <button 
                onClick={() => setAnnouncementFilter('all')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: announcementFilter === 'all' ? '2px solid rgb(135, 35, 65)' : '1px solid rgb(200, 200, 200)',
                  background: announcementFilter === 'all' ? 'rgba(135, 35, 65, 0.1)' : 'white',
                  color: announcementFilter === 'all' ? 'rgb(135, 35, 65)' : 'rgb(100, 100, 100)',
                  fontWeight: announcementFilter === 'all' ? '600' : '500',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <FaBullhorn size={11} />
                All
              </button>
              <button 
                onClick={() => setAnnouncementFilter('recent')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: announcementFilter === 'recent' ? '2px solid rgb(135, 35, 65)' : '1px solid rgb(200, 200, 200)',
                  background: announcementFilter === 'recent' ? 'rgba(135, 35, 65, 0.1)' : 'white',
                  color: announcementFilter === 'recent' ? 'rgb(135, 35, 65)' : 'rgb(100, 100, 100)',
                  fontWeight: announcementFilter === 'recent' ? '600' : '500',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <FaClock size={11} />
                Recent
              </button>
              <button 
                onClick={() => setAnnouncementFilter('important')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: announcementFilter === 'important' ? '2px solid rgb(135, 35, 65)' : '1px solid rgb(200, 200, 200)',
                  background: announcementFilter === 'important' ? 'rgba(135, 35, 65, 0.1)' : 'white',
                  color: announcementFilter === 'important' ? 'rgb(135, 35, 65)' : 'rgb(100, 100, 100)',
                  fontWeight: announcementFilter === 'important' ? '600' : '500',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <FaExclamationTriangle size={11} />
                Important
              </button>
            </div>

            {/* Search */}
            <div style={{
              padding: '0 1.5rem 1rem',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center'
              }}>
                <FaSearch size={13} style={{
                  position: 'absolute',
                  left: '0.75rem',
                  color: 'rgb(135, 35, 65)',
                  pointerEvents: 'none',
                  zIndex: 1
                }} />
                <input
                  type="text"
                  placeholder="Search announcements..."
                  value={announcementSearchQuery}
                  onChange={(e) => setAnnouncementSearchQuery(e.target.value)}
                  ref={(el) => {
                    if (el) {
                      el.style.setProperty('background', 'white', 'important');
                      el.style.setProperty('color', 'rgb(50, 50, 50)', 'important');
                      el.style.setProperty('border', '1.5px solid rgb(135, 35, 65)', 'important');
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem 0.6rem 2.5rem',
                    borderRadius: '6px',
                    fontSize: '0.813rem',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    fontWeight: '500'
                  }}
                  onFocus={(e) => {
                    e.target.style.setProperty('border', '1.5px solid rgb(135, 35, 65)', 'important');
                    e.target.style.boxShadow = '0 0 0 3px rgba(135, 35, 65, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.setProperty('border', '1.5px solid rgb(135, 35, 65)', 'important');
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>
            </div>

            {/* Announcement List */}
            <div style={{
              padding: '1rem',
              flex: '1 1 0%',
              overflow: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}>
              {filteredAnnouncements.length > 0 ? (
                filteredAnnouncements.map((announcement, index) => {
                  const isSelected = selectedAnnouncement?.id === announcement.id;
                  const isImportant = announcement.type === 'important';
                  const isRecent = new Date(announcement.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                  
                  return (
                    <div 
                      key={announcement.id} 
                      onClick={() => handleAnnouncementSelection(announcement)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        padding: '0.75rem',
                        borderRadius: '0px',
                        background: isSelected ? 'rgb(245, 245, 245)' : 'rgb(255, 255, 255)',
                        border: isSelected ? '2px solid rgb(135, 35, 65)' : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: 'rgba(0, 0, 0, 0.15) 0px 2px 6px'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.25)';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.boxShadow = '0px 2px 6px rgba(0, 0, 0, 0.15)';
                          e.currentTarget.style.transform = 'translateY(0px)';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: 'rgb(50, 50, 50)',
                          margin: '0',
                          flex: 1
                        }}>
                          {announcement.title}
                        </h4>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap', marginLeft: '0.5rem' }}>
                          {isImportant && (
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: '600',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              background: 'rgb(254, 226, 226)',
                              color: 'rgb(153, 27, 27)'
                            }}>
                              Important
                            </span>
                          )}
                          {isRecent && (
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: '600',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              background: 'rgb(224, 231, 255)',
                              color: 'rgb(55, 48, 163)'
                            }}>
                              Recent
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p style={{
                        fontSize: '0.75rem',
                        color: 'rgb(100, 100, 100)',
                        margin: '0',
                        lineHeight: '1.4',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {announcement.content && announcement.content.length > 0
                          ? (() => {
                              const plainText = announcement.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
                              return plainText.length > 80 
                                ? `${plainText.substring(0, 80)}...` 
                                : plainText;
                            })()
                          : 'No content provided'}
                      </p>
                      
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.625rem',
                          fontWeight: '500',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          background: 'rgb(243, 244, 246)',
                          color: 'rgb(75, 85, 99)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <FaCalendarAlt size={10} />
                          {new Date(announcement.created_at).toLocaleDateString()}
                        </span>
                        <span style={{
                          fontSize: '0.625rem',
                          fontWeight: '500',
                          padding: '0.125rem 0.5rem',
                          borderRadius: '9999px',
                          background: 'rgb(243, 244, 246)',
                          color: 'rgb(75, 85, 99)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem'
                        }}>
                          <FaTag size={10} />
                          {announcement.type || 'General'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{
                  color: 'rgba(100, 100, 100, 0.7)',
                  textAlign: 'center',
                  padding: '2rem'
                }}>No announcements found</p>
              )}
            </div>
          </div>

          {/* Right Side - Announcement Details Card */}
          <div style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '700px',
            minHeight: '700px',
            maxHeight: '700px',
            width: '100%',
            flex: '1'
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

            {selectedAnnouncement ? (
              <>
                {/* Header */}
                <div style={{
                  padding: '1.5rem 1.5rem 1rem',
                  borderBottom: '2px solid rgb(135, 35, 65)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  backgroundColor: 'rgb(255, 255, 255)'
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <h3 style={{
                        color: 'rgb(135, 35, 65)',
                        fontWeight: '700',
                        margin: '0px',
                        fontSize: '1.1rem'
                      }}>
                        {selectedAnnouncement.title}
                      </h3>
                      {selectedAnnouncement.type === 'important' && (
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '9999px',
                          background: 'rgb(254, 226, 226)',
                          color: 'rgb(153, 27, 27)'
                        }}>
                          Important
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', fontSize: '0.75rem', color: 'rgb(100, 100, 100)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FaUser size={12} />
                        {selectedAnnouncement.professoraccounts?.first_name} {selectedAnnouncement.professoraccounts?.last_name}
                      </span>
                      <span>•</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <FaCalendarAlt size={12} />
                        {new Date(selectedAnnouncement.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {selectedAnnouncement.updated_at !== selectedAnnouncement.created_at && (
                        <>
                          <span>•</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <FaEdit size={12} />
                            Updated {new Date(selectedAnnouncement.updated_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                    <button 
                      onClick={() => handleEditAnnouncement(selectedAnnouncement)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'rgb(135, 35, 65)',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgb(110, 25, 50)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgb(135, 35, 65)'}
                    >
                      <FaEdit size={12} />
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteAnnouncement(selectedAnnouncement.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '6px',
                        border: 'none',
                        background: 'rgb(244, 67, 54)',
                        color: 'white',
                        fontWeight: '600',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgb(211, 47, 47)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgb(244, 67, 54)'}
                    >
                      <FaTrash size={12} />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '1.5rem',
                  backgroundColor: 'rgb(249, 250, 251)'
                }}>
                  {/* Main Content Card */}
                  <div style={{
                    backgroundColor: 'rgb(255, 255, 255)',
                    borderRadius: '8px',
                    padding: '1.5rem',
                    marginBottom: '1.5rem',
                    border: '1px solid rgb(229, 231, 235)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }}>
                    <div 
                      style={{
                        fontSize: '0.875rem',
                        lineHeight: '1.6',
                        color: 'rgb(50, 50, 50)'
                      }}
                      dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }}
                    />
                  </div>

                  {/* File Attachments */}
                  {selectedAnnouncement.announcement_files && selectedAnnouncement.announcement_files.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: 'rgb(50, 50, 50)',
                        marginBottom: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaPaperclip size={14} />
                        Attachments ({selectedAnnouncement.announcement_files.length})
                      </h4>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '0.75rem'
                      }}>
                        {selectedAnnouncement.announcement_files.map(file => (
                          <div key={file.id} style={{
                            padding: '0.75rem',
                            border: '1px solid rgb(229, 231, 235)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            backgroundColor: 'rgb(255, 255, 255)',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = 'none';
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                          >
                            {file.is_image ? (
                              <img 
                                src={file.file_path}
                                alt={file.file_name}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  objectFit: 'cover',
                                  borderRadius: '4px'
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: 'rgb(135, 35, 65)',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                              }}>
                                <FaFile size={18} />
                              </div>
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                color: 'rgb(50, 50, 50)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>{file.file_name}</div>
                              <div style={{
                                fontSize: '0.625rem',
                                color: 'rgb(107, 114, 128)'
                              }}>{(file.file_size / 1024).toFixed(1)} KB</div>
                            </div>
                            <a
                              href={file.file_path}
                              download={file.file_name}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                padding: '0.5rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgb(135, 35, 65)',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s ease',
                                textDecoration: 'none'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgb(110, 25, 50)'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'rgb(135, 35, 65)'}
                            >
                              <FaDownload size={12} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comments Section */}
                  <div>
                    <h4 style={{
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: 'rgb(50, 50, 50)',
                      marginBottom: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
                      <FaComments size={14} />
                      Comments ({selectedAnnouncement.announcement_comments?.length || 0})
                    </h4>
                    
                    {/* Custom Comments Display with Limit */}
                    <div style={{
                      backgroundColor: 'rgb(255, 255, 255)',
                      borderRadius: '8px',
                      padding: '1rem',
                      border: '1px solid rgb(229, 231, 235)'
                    }}>
                      {selectedAnnouncement.announcement_comments && selectedAnnouncement.announcement_comments.length > 0 ? (
                        <>
                          {selectedAnnouncement.announcement_comments
                            .slice(0, showAllComments ? undefined : 2)
                            .map((comment, index) => {
                              // Get proper user data from the comment
                              // Backend returns user data in comment.user object
                              let userName = 'Unknown User';
                              let userInitials = 'U';
                              let profileImage = null;
                              
                              if (comment.user) {
                                // Backend returns user data in comment.user
                                userName = `${comment.user.first_name} ${comment.user.last_name}`;
                                userInitials = `${comment.user.first_name?.[0] || ''}${comment.user.last_name?.[0] || ''}`;
                                profileImage = comment.user.profile_image_url;
                              } else if (comment.professoraccounts) {
                                userName = `${comment.professoraccounts.first_name} ${comment.professoraccounts.last_name}`;
                                userInitials = `${comment.professoraccounts.first_name?.[0] || ''}${comment.professoraccounts.last_name?.[0] || ''}`;
                                profileImage = comment.professoraccounts.profile_image_url;
                              } else if (comment.studentaccounts) {
                                userName = `${comment.studentaccounts.first_name} ${comment.studentaccounts.last_name}`;
                                userInitials = `${comment.studentaccounts.first_name?.[0] || ''}${comment.studentaccounts.last_name?.[0] || ''}`;
                                profileImage = comment.studentaccounts.profile_image_url;
                              } else if (comment.user_type === 'professor' && course.professoraccounts) {
                                // Fallback: if no nested data but we know it's the professor
                                userName = `${course.professoraccounts.first_name} ${course.professoraccounts.last_name}`;
                                userInitials = `${course.professoraccounts.first_name?.[0] || ''}${course.professoraccounts.last_name?.[0] || ''}`;
                                profileImage = course.professoraccounts.profile_image_url;
                              }
                              
                              return (
                                <div key={comment.id} style={{
                                  display: 'flex',
                                  gap: '0.75rem',
                                  padding: '0.75rem',
                                  backgroundColor: index % 2 === 0 ? 'rgb(249, 250, 251)' : 'rgb(255, 255, 255)',
                                  borderRadius: '6px',
                                  marginBottom: '0.5rem'
                                }}>
                                  {/* Profile Picture */}
                                  <div style={{ flexShrink: 0 }}>
                                    {profileImage ? (
                                      <img
                                        src={profileImage}
                                        alt={userName}
                                        style={{
                                          width: '36px',
                                          height: '36px',
                                          borderRadius: '6px',
                                          objectFit: 'cover'
                                        }}
                                        onError={(e) => {
                                          e.target.style.display = 'none';
                                          e.target.nextSibling.style.display = 'flex';
                                        }}
                                      />
                                    ) : null}
                                    <div style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '6px',
                                      backgroundColor: 'rgb(135, 35, 65)',
                                      display: profileImage ? 'none' : 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white',
                                      fontWeight: '600',
                                      fontSize: '0.875rem'
                                    }}>
                                      {userInitials}
                                    </div>
                                  </div>
                                  
                                  {/* Comment Content */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '0.5rem',
                                      marginBottom: '0.25rem'
                                    }}>
                                      <span style={{
                                        fontWeight: '600',
                                        fontSize: '0.813rem',
                                        color: 'rgb(50, 50, 50)'
                                      }}>
                                        {userName}
                                      </span>
                                      <span style={{
                                        fontSize: '0.688rem',
                                        color: 'rgb(156, 163, 175)'
                                      }}>
                                        {new Date(comment.created_at).toLocaleString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                          hour: 'numeric',
                                          minute: '2-digit',
                                          hour12: true
                                        })}
                                      </span>
                                    </div>
                                    <p style={{
                                      fontSize: '0.813rem',
                                      color: 'rgb(75, 85, 99)',
                                      margin: 0,
                                      lineHeight: '1.4',
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {comment.content}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          
                          {/* View More Button */}
                          {selectedAnnouncement.announcement_comments.length > 2 && (
                            <button
                              onClick={() => setShowAllComments(!showAllComments)}
                              style={{
                                width: '100%',
                                padding: '0.5rem',
                                marginTop: '0.5rem',
                                backgroundColor: 'rgb(249, 250, 251)',
                                border: '1px solid rgb(229, 231, 235)',
                                borderRadius: '6px',
                                color: 'rgb(135, 35, 65)',
                                fontSize: '0.813rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.backgroundColor = 'rgb(135, 35, 65)';
                                e.target.style.color = 'white';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.backgroundColor = 'rgb(249, 250, 251)';
                                e.target.style.color = 'rgb(135, 35, 65)';
                              }}
                            >
                              {showAllComments 
                                ? `Show Less` 
                                : `View ${selectedAnnouncement.announcement_comments.length - 2} More Comment${selectedAnnouncement.announcement_comments.length - 2 > 1 ? 's' : ''}`
                              }
                            </button>
                          )}
                        </>
                      ) : (
                        <p style={{
                          textAlign: 'center',
                          color: 'rgb(156, 163, 175)',
                          fontSize: '0.813rem',
                          padding: '1rem 0',
                          margin: 0
                        }}>
                          No comments yet
                        </p>
                      )}
                      
                      {/* Add Comment Form - Simple Inline Form */}
                      <form 
                        onSubmit={async (e) => {
                          e.preventDefault();
                          const formData = new FormData(e.target);
                          const content = formData.get('comment');
                          if (content && content.trim()) {
                            await handleAddComment({ content: content.trim(), parent_comment_id: null });
                            e.target.reset();
                          }
                        }}
                        style={{ 
                          marginTop: '1rem', 
                          paddingTop: '1rem', 
                          borderTop: '1px solid rgb(229, 231, 235)',
                          display: 'flex',
                          gap: '0.5rem',
                          alignItems: 'flex-start'
                        }}
                      >
                        <textarea
                          name="comment"
                          placeholder="Write a comment..."
                          required
                          style={{
                            flex: 1,
                            padding: '0.5rem 0.75rem',
                            border: '1px solid rgb(229, 231, 235)',
                            borderRadius: '6px',
                            fontSize: '0.813rem',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            minHeight: '40px',
                            maxHeight: '120px',
                            background: 'rgb(255, 255, 255)',
                            color: 'rgb(50, 50, 50)',
                            outline: 'none'
                          }}
                          className="comment-textarea-override"
                          onFocus={(e) => {
                            e.target.style.borderColor = 'rgb(135, 35, 65)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = 'rgb(229, 231, 235)';
                          }}
                        />
                        <button
                          type="submit"
                          style={{
                            padding: '0.5rem 0.75rem',
                            backgroundColor: 'rgb(135, 35, 65)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.813rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '40px',
                            minHeight: '40px'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgb(115, 25, 55)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'rgb(135, 35, 65)'}
                        >
                          <FaPaperPlane size={14} />
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgb(255, 255, 255)',
                padding: '2rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <FaBullhorn size={48} style={{ color: 'rgb(209, 213, 219)', marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: 'rgb(75, 85, 99)', margin: '0 0 0.5rem 0' }}>
                    Select an Announcement
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: 'rgb(156, 163, 175)', margin: 0 }}>
                    Choose an announcement from the list to view its details and content.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Style override for comment textarea and attempt dropdown */}
        <style>{`
          .comment-textarea-override {
            background: rgb(255, 255, 255) !important;
            color: rgb(50, 50, 50) !important;
            border: 1px solid rgb(229, 231, 235) !important;
          }
          .comment-textarea-override:focus {
            background: rgb(255, 255, 255) !important;
            color: rgb(50, 50, 50) !important;
            border-color: rgb(135, 35, 65) !important;
            outline: none !important;
          }
          .attempt-dropdown-override {
            background: rgb(255, 255, 255) !important;
            color: rgb(31, 41, 55) !important;
            border: 1.5px solid rgb(209, 213, 219) !important;
          }
          .attempt-dropdown-override:focus {
            background: rgb(255, 255, 255) !important;
            color: rgb(31, 41, 55) !important;
            border-color: rgb(52, 101, 109) !important;
            outline: none !important;
          }
          .attempt-dropdown-override option {
            background: rgb(255, 255, 255) !important;
            color: rgb(31, 41, 55) !important;
          }

          /* Print Styles for Report Modal */
          @media print {
            body * {
              visibility: hidden;
            }
            .print-report-modal, .print-report-modal * {
              visibility: visible;
            }
            .print-report-modal {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            .no-print {
              display: none !important;
            }
            @page {
              margin: 1cm;
              size: A4;
            }
          }
        `}</style>

        {/* Announcement Modal */}
        {showAnnouncementModal && (
          <AnnouncementModal
            announcement={editingAnnouncement}
            onClose={() => {
              setShowAnnouncementModal(false);
              setEditingAnnouncement(null);
            }}
            onSave={handleSaveAnnouncement}
          />
        )}
      </div>
    );
  }

  function renderGradeSubmissions() {
    // Extract real data from selected submission
    const selectedSubmissionData = gradeSubmissionsView.selectedSubmission || gradeSubmissionsView.selectedTask;
    
    // Helper function to extract member ID from various possible field names
    const extractMemberId = (member) => {
      return member.member_id || member.memberId || member.student_id || member.studentId || member.id;
    };
    
    // Use the computed group members from useMemo at the component level
    const groupMembers = computedGroupMembers;


    // Extract member tasks map
    const extractMemberTasks = () => {
      if (!selectedSubmissionData || !selectedSubmissionData.memberTasks) {
        // Return empty object - no dummy data
        return {};
      }

      const tasksMap = {};
      selectedSubmissionData.memberTasks.forEach(memberTask => {
        const memberId = memberTask.member_id;
        
        // Handle different structures: phase submissions have tasks directly, project submissions have phases with tasks
        let tasks = [];
        if (memberTask.tasks && Array.isArray(memberTask.tasks)) {
          // Phase submission structure: tasks are directly in memberTask.tasks
          tasks = memberTask.tasks;
        } else if (memberTask.phases && Array.isArray(memberTask.phases)) {
          // Project submission structure: tasks are nested in phases array
          memberTask.phases.forEach(phase => {
            if (phase.tasks && Array.isArray(phase.tasks)) {
              // Add phase information to each task
              tasks.push(...phase.tasks.map(task => ({
                ...task,
                phase_id: phase.phase_id,
                phase_title: phase.phase_title,
                phase_number: phase.phase_number
              })));
            }
          });
        }
        
        tasksMap[memberId] = tasks.map(task => {
          // Get all attempts
          let allAttempts = [];
          if (task.submission_files && task.submission_files.length > 0) {
            allAttempts = task.submission_files;
          }
          
          // Determine which attempt to display (use selected or latest)
          const selectedAttemptNum = selectedAttempts[task.task_id];
          let displayAttempt = null;
          
          if (selectedAttemptNum !== undefined && selectedAttemptNum >= 0 && selectedAttemptNum < allAttempts.length) {
            displayAttempt = allAttempts[selectedAttemptNum];
          } else if (allAttempts.length > 0) {
            // Default to latest attempt
            displayAttempt = allAttempts[allAttempts.length - 1];
          }
          
          let files = [];
          let submissionStatus = task.status;
          let submittedAt = null;
          
          if (displayAttempt) {
            submissionStatus = displayAttempt.status || task.status;
            submittedAt = displayAttempt.submitted_at;
            
            // Get files from display attempt - these are task submission files
            if (displayAttempt.files && Array.isArray(displayAttempt.files)) {
              // Files are stored as relative paths like: ["task_id/attempt_1/filename.pdf"]
              // Convert them to full Supabase URLs for task-submissions bucket
              files = displayAttempt.files.map(filePath => {
                if (typeof filePath === 'string') {
                  // Relative path - construct full Supabase URL for task-submissions bucket
                  const baseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://qorkowgfjjuwxelumuut.supabase.co';
                  const fileName = decodeURIComponent(filePath.split('/').pop() || 'submission_file');
                  // URL encode each path segment to handle special characters and spaces
                  const encodedPath = filePath.split('/').map(part => encodeURIComponent(part)).join('/');
                  return {
                    url: `${baseUrl}/storage/v1/object/public/task-submissions/${encodedPath}`,
                    name: fileName,
                    path: filePath
                  };
                } else if (typeof filePath === 'object' && filePath.url) {
                  // Already has full URL
                  return filePath;
                } else {
                  return { url: filePath, name: 'submission_file' };
                }
              });
            }
          }
          
          // DO NOT overwrite task files with submission files - they are different things
          // Task files = individual task submissions
          // Submission files = project/phase deliverable files
          
          return {
            id: task.task_id || task.id,
            title: task.title,
            status: submissionStatus,
            due_date: task.due_date,
            phase_number: task.phase_number || 1,
            phase_id: task.phase_id,
            phase_title: task.phase_title,
            files: files,
            allAttempts: allAttempts,
            currentAttemptIndex: selectedAttemptNum !== undefined ? selectedAttemptNum : (allAttempts.length > 0 ? allAttempts.length - 1 : -1),
            submittedAt: submittedAt
          };
        });
      });
      return tasksMap;
    };

    // Get all submission versions (original + resubmissions)
    const getSubmissionVersions = () => {
      if (!gradeSubmissionsView.selectedSubmission) {
        console.log('❌ No selectedSubmission');
        return [];
      }
      
      const current = gradeSubmissionsView.selectedSubmission;
      console.log('🔍 Getting versions for submission:', {
        id: current.id,
        is_resubmission: current.is_resubmission,
        resubmission_number: current.resubmission_number,
        original_submission_id: current.original_submission_id
      });
      
      const versions = [];
      
      console.log('🔎 Checking conditions - is_resubmission:', current.is_resubmission, 'has original_submission_id:', !!current.original_submission_id);
      
      // If this is a resubmission, add the original first
      if (current.is_resubmission && current.original_submission_id) {
        console.log('✅ Is resubmission - looking for original with id:', current.original_submission_id);
        
        // Try to find original in detailsData (all submissions for this project)
        const originalSubmission = gradeSubmissionsView.detailsData.find(
          s => s.id === current.original_submission_id
        );
        
        console.log('🔎 Found original?:', !!originalSubmission);
        
        if (originalSubmission) {
          versions.push({
            id: originalSubmission.id,
            version: 0,
            label: 'Original Submission',
            isResubmission: false,
            submittedAt: originalSubmission.submitted_at
          });
        }
        
        // Add current resubmission
        versions.push({
          id: current.id,
          version: current.resubmission_number,
          label: `Resubmission #${current.resubmission_number}`,
          isResubmission: true,
          submittedAt: current.submitted_at
        });
      } else if (!current.is_resubmission) {
        console.log('✅ Is original - looking for resubmissions');
        
        // This is original, look for resubmissions
        versions.push({
          id: current.id,
          version: 0,
          label: 'Original Submission',
          isResubmission: false,
          submittedAt: current.submitted_at
        });
        
        // Find resubmissions in detailsData
        const resubmissions = gradeSubmissionsView.detailsData.filter(
          s => s.original_submission_id === current.id && s.is_resubmission
        );
        
        console.log('🔎 Found resubmissions:', resubmissions.length);
        
        resubmissions.forEach(resub => {
          versions.push({
            id: resub.id,
            version: resub.resubmission_number,
            label: `Resubmission #${resub.resubmission_number}`,
            isResubmission: true,
            submittedAt: resub.submitted_at
          });
        });
      } else {
        console.log('❌ No matching conditions');
      }
      
      console.log('📋 Available versions:', versions);
      return versions;
    };

    // Extract member evaluations
    const extractMemberEvaluations = () => {
      if (!selectedSubmissionData || !selectedSubmissionData.evaluationSubmissions) {
        // Return empty object - no dummy data
        return {};
      }

      const evalsMap = {};
      selectedSubmissionData.evaluationSubmissions.forEach(memberEval => {
        const memberId = memberEval.member_id;
        
        // Check for submission status in multiple places:
        // 1. Direct property: has_submitted_own_evaluations
        // 2. Project evaluation: project_evaluation.has_submitted
        // 3. Phase evaluations: phase_evaluations (submitted_count > 0)
        let hasSubmitted = memberEval.has_submitted_own_evaluations || false;
        let submissionDate = memberEval.own_evaluation_submission_date;
        
        // Also check project_evaluation if it exists
        if (memberEval.project_evaluation && memberEval.project_evaluation.has_submitted) {
          hasSubmitted = true;
          submissionDate = memberEval.project_evaluation.submission_date || submissionDate;
        }
        
        // evaluations_received is an array of evaluation objects with evaluator info and scores
        evalsMap[memberId] = {
          hasSubmitted: hasSubmitted,
          own_evaluation_submission_date: submissionDate,
          evaluationSubmissionId: memberEval.evaluation_submission_id,
          evaluationsReceived: (memberEval.evaluations_received || []).map((evaluation, idx) => ({
            id: `eval-${memberId}-${idx}`,
            evaluator_name: evaluation.evaluator_name,
            evaluator_id: evaluation.evaluator_id,
            evaluator_role: evaluation.evaluator_role,
            score: evaluation.total_score || evaluation.percentage || 0,
            percentage: evaluation.percentage || 0,
            feedback: evaluation.comments || 'No feedback provided',
            evaluationForm: evaluation.evaluation_form || {},
            submissionDate: evaluation.submission_date
          }))
        };
      });
      return evalsMap;
    };

    // Extract member inclusions
    const extractMemberInclusions = () => {
      if (!selectedSubmissionData || !selectedSubmissionData.memberInclusions) {
        // Return empty object - no dummy data
        return {};
      }

      const inclusionsMap = {};
      selectedSubmissionData.memberInclusions.forEach(inclusion => {
        inclusionsMap[inclusion.member_id] = {
          included: inclusion.included,
          reason: inclusion.exclusion_reason || ''
        };
      });
      return inclusionsMap;
    };

    // groupMembers is now computed with useMemo above
    const memberTasks = extractMemberTasks();
    const memberEvaluations = extractMemberEvaluations();
    const memberInclusions = extractMemberInclusions();

    // Member grades - calculate from evaluation scores or use stored grades
    const memberGrades = {};
    Object.keys(memberEvaluations).forEach(memberId => {
      const evals = memberEvaluations[memberId];
      const avgScore = evals.length > 0 
        ? evals.reduce((sum, e) => sum + parseFloat(e.score), 0) / evals.length 
        : 0;
      memberGrades[memberId] = {
        individualGrade: Math.round(avgScore),
        groupGrade: selectedSubmissionData?.grade || 88
      };
    });



    // No auto-injection of dummy data - let user select a project first

    // Helper function to safely get file URLs as an array
    const getFileUrlsArray = (fileUrls) => {
      if (!fileUrls) return [];
      if (Array.isArray(fileUrls)) {
        // Handle array of file objects or strings
        return fileUrls.map(file => {
          if (typeof file === 'object' && file.url) {
            return file; // Return the file object with url, name, etc.
          }
          return { url: file, name: file }; // Convert string to object
        });
      }
      if (typeof fileUrls === 'string') {
        try {
          const parsed = JSON.parse(fileUrls);
          if (Array.isArray(parsed)) {
            return parsed.map(file => {
              if (typeof file === 'object' && file.url) {
                return file;
              }
              return { url: file, name: file };
            });
          }
          return [{ url: parsed, name: parsed }];
        } catch {
          return [{ url: fileUrls, name: fileUrls }]; // If it's a single URL string
        }
      }
      return [];
    };

    // Download file for grade submissions
    const downloadSubmissionFile = async (fileUrl, fileName) => {
      try {
        console.log('📥 Downloading submission file:', fileUrl, 'filename:', fileName);
        
        // Handle both object format (with url property) and string format
        let filePath = typeof fileUrl === 'object' && fileUrl.path ? fileUrl.path : null;
        let fullUrl = typeof fileUrl === 'object' && fileUrl.url ? fileUrl.url : fileUrl;
        let downloadFileName = fileName || (typeof fileUrl === 'object' && fileUrl.name ? fileUrl.name : 'downloaded_file');
        
        console.log('📥 Full URL before processing:', fullUrl, 'Type:', typeof fullUrl, 'FilePath:', filePath);
        
        // Extract relative path from full URL if we don't have it
        if (!filePath && fullUrl) {
          // Extract path from Supabase URL
          // Format: https://qorkowgfjjuwxelumuut.supabase.co/storage/v1/object/public/{bucket}/path/to/file
          const match = fullUrl.match(/\/storage\/v1\/object\/public\/(?:task-submissions|custom-files|phase-deliverables|project-deliverables)\/(.+)$/);
          if (match) {
            filePath = match[1];
            console.log('📁 Extracted file path from URL:', filePath);
          }
        }
        
        // Determine which bucket to use from the path
        let bucket = 'task-submissions'; // Default
        if (filePath) {
          if (filePath.startsWith('phase-deliverables/')) {
            bucket = 'phase-deliverables';
          } else if (filePath.startsWith('project-deliverables/')) {
            bucket = 'project-deliverables';
          } else if (filePath.startsWith('custom-files/')) {
            bucket = 'custom-files';
          }
        } else if (fullUrl) {
          if (fullUrl.includes('phase-deliverables')) {
            bucket = 'phase-deliverables';
          } else if (fullUrl.includes('project-deliverables')) {
            bucket = 'project-deliverables';
          } else if (fullUrl.includes('custom-files')) {
            bucket = 'custom-files';
          }
        }
        
        console.log('📦 Detected bucket:', bucket, 'for path:', filePath);
        
        // If we have a file path, use the backend API endpoint for downloads
        if (filePath) {
          console.log('📥 Using backend API for download from bucket:', bucket);
          const token = localStorage.getItem('token');
          const response = await fetch(
            `${apiConfig.baseURL}/api/professor-grading/download-file?path=${encodeURIComponent(filePath)}`,
            {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Download failed with response:', response.status, errorText);
            console.error('❌ Failed path was:', filePath);
            throw new Error(`Failed to download file: ${response.status}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = downloadFileName || 'downloaded_file';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          console.log('✅ Download completed:', downloadFileName);
          return;
        }

        // Fallback: Try direct fetch from URL if no file path
        console.log('📥 Fallback: Using direct fetch from URL');
        const response = await fetch(fullUrl);
        if (!response.ok) {
          console.error('❌ Failed to fetch file:', response.status, response.statusText);
          console.error('❌ Failed URL was:', fullUrl);
          throw new Error(`Failed to fetch file: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadFileName || 'downloaded_file';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        console.log('✅ File downloaded successfully:', fileName);
      } catch (error) {
        console.error('Download error:', error);
        alert('Failed to download file. Please try again.');
      }
    };

    const handleProjectSelect = async (project) => {
      setGradeSubmissionsView(prev => ({
        ...prev,
        selectedProject: project,
        showProjectDropdown: false,
        loading: true
      }));

      try {
        const token = localStorage.getItem('token');
        
        // Fetch all submissions for this project (both phase and project)
        const submissionsResponse = await fetch(
          `${apiConfig.baseURL}/api/grade-submissions/projects/${project.id}/submissions`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!submissionsResponse.ok) {
          throw new Error('Failed to load submissions');
        }
        
        const data = await submissionsResponse.json();
        
        // Transform the data to match the expected format
        const phaseSubmissionsFormatted = (data.phaseSubmissions || []).map(sub => ({
          id: sub.id,
          taskId: sub.id,
          latestStatus: sub.status || 'pending',
          submissionType: 'phase',
          type: 'phase',
          projectId: sub.projectId,
          phaseId: sub.phaseId,
          phaseNumber: sub.phaseNumber,
          phaseTitle: sub.phaseTitle,
          phaseName: sub.phaseTitle || sub.phaseName || '',
          groupId: sub.groupId,
          groupName: sub.groupName,
          grade: sub.grade,
          maxGrade: sub.maxGrade,
          gradedAt: sub.gradedAt,
          gradedBy: sub.gradedBy,
          instructor_feedback: sub.instructorFeedback,
          feedback: sub.instructorFeedback,
          memberTasks: sub.memberTasks,
          evaluationSubmissions: sub.evaluationSubmissions,
          memberInclusions: sub.memberInclusions,
          validationResults: sub.validationResults,
          phaseSnapshot: sub.phaseSnapshot,
          rubricData: sub.rubricData, // ✅ Add rubric data from backend
          files: sub.files,
          fileUrls: sub.files,
          // Add resubmission fields (camelCase from backend)
          is_resubmission: sub.isResubmission,
          resubmission_number: sub.resubmissionNumber,
          original_submission_id: sub.originalSubmissionId,
          submitted_at: sub.submittedAt,
          attempts: [{
            submissionId: sub.id,
            taskId: sub.id,
            memberName: sub.groupName || 'Unknown Group',
            memberProfileImage: sub.submittedBy?.profileImage,
            submittedAt: sub.submittedAt,
            status: sub.status || 'pending',
            submissionText: sub.submissionText,
            fileUrls: sub.files,
            submittedBy: sub.submittedBy
          }]
        }));

        const projectSubmissionsFormatted = (data.projectSubmissions || []).map(sub => ({
          id: sub.id,
          taskId: sub.id,
          latestStatus: sub.status || 'pending',
          submissionType: 'project',
          type: 'project',
          projectId: sub.projectId,
          groupId: sub.groupId,
          groupName: sub.groupName,
          grade: sub.grade,
          maxGrade: sub.maxGrade,
          gradedAt: sub.gradedAt,
          gradedBy: sub.gradedBy,
          instructor_feedback: sub.instructorFeedback,
          feedback: sub.instructorFeedback,
          memberTasks: sub.memberTasks,
          evaluationSubmissions: sub.evaluationSubmissions,
          memberInclusions: sub.memberInclusions,
          validationResults: sub.validationResults,
          projectSnapshot: sub.projectSnapshot,
          rubricData: sub.rubricData, // ✅ Add rubric data from backend
          phaseDeliverables: sub.phaseDeliverables,
          files: sub.files,
          fileUrls: sub.files,
          // Add resubmission fields (camelCase from backend)
          is_resubmission: sub.isResubmission,
          resubmission_number: sub.resubmissionNumber,
          original_submission_id: sub.originalSubmissionId,
          submitted_at: sub.submittedAt,
          attempts: [{
            submissionId: sub.id,
            taskId: sub.id,
            memberName: sub.groupName || 'Unknown Group',
            memberProfileImage: sub.submittedBy?.profileImage,
            submittedAt: sub.submittedAt,
            status: sub.status || 'pending',
            submissionText: sub.submissionText,
            fileUrls: sub.files,
            submittedBy: sub.submittedBy
          }]
        }));

        // Log formatted submissions to verify data
        console.log('🔍 Phase Submissions Formatted:', phaseSubmissionsFormatted.map(s => ({
          id: s.id,
          phaseName: s.phaseName,
          groupName: s.groupName,
          type: s.type
        })));
        console.log('🔍 Project Submissions Formatted:', projectSubmissionsFormatted.map(s => ({
          id: s.id,
          groupName: s.groupName,
          type: s.type,
          projectSnapshot: s.projectSnapshot,
          hasMAXATTEMPT: !!s.projectSnapshot?.MAXATTEMPT,
          MAXATTEMPT: s.projectSnapshot?.MAXATTEMPT
        })));

        // Combine both types
        const allSubmissions = [...phaseSubmissionsFormatted, ...projectSubmissionsFormatted];
        
        setGradeSubmissionsView(prev => ({
          ...prev,
          detailsData: allSubmissions,
          loading: false
        }));
      } catch (error) {
        console.error('Error loading grade submissions data:', error);
        setGradeSubmissionsView(prev => ({
          ...prev,
          loading: false
        }));
      }
    };

    const handlePhaseSelect = async (phase) => {
      setGradeSubmissionsView(prev => ({
        ...prev,
        selectedPhase: phase,
        loading: true
      }));

      try {
        const token = localStorage.getItem('token');
        const submissionsResponse = await fetch(
          `${apiConfig.baseURL}/api/submission-checking/${gradeSubmissionsView.selectedProject.id}/phase/${phase.id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (submissionsResponse.ok) {
          const submissionsData = await submissionsResponse.json();
          setGradeSubmissionsView(prev => ({
            ...prev,
            detailsData: submissionsData.submissions || [],
            loading: false
          }));
        }
      } catch (error) {
        console.error('Error loading phase submissions:', error);
        setGradeSubmissionsView(prev => ({
          ...prev,
          loading: false
        }));
      }
    };

    // Handle member inclusion update
    const handleMemberInclusionUpdate = async (memberId, included, reason) => {
      try {
        const token = localStorage.getItem('token');
        const selectedSubmissionData = gradeSubmissionsView.selectedSubmission || gradeSubmissionsView.selectedTask;
        
        if (!selectedSubmissionData) {
          throw new Error('No submission selected');
        }

        const submissionId = selectedSubmissionData.id || selectedSubmissionData.attempts?.[0]?.submissionId;
        const submissionType = selectedSubmissionData.type || selectedSubmissionData.submissionType;

        const response = await fetch(
          `${apiConfig.baseURL}/api/grade-submissions/submissions/${submissionId}/member-inclusion`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              type: submissionType,
              memberId,
              included,
              reason
            })
          }
        );

        if (response.ok) {
          // Update the submission in local state to reflect the inclusion change
          if (gradeSubmissionsView.detailsData && selectedSubmissionData) {
            setGradeSubmissionsView(prev => ({
              ...prev,
              detailsData: prev.detailsData.map(item => {
                if (item.id === selectedSubmissionData.id) {
                  const updatedInclusions = (item.memberInclusions || []).map(inc =>
                    inc.member_id === memberId
                      ? { ...inc, included, exclusion_reason: reason }
                      : inc
                  );
                  return { ...item, memberInclusions: updatedInclusions };
                }
                return item;
              })
            }));
          }
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update member inclusion');
        }
      } catch (error) {
        console.error('Error updating member inclusion:', error);
        setNotifications(prev => [...prev, {
          id: Date.now(),
          type: 'error',
          message: error.message || 'Failed to update member inclusion. Please try again.',
          timestamp: new Date()
        }]);
      }
    };

    // Sort submissions
    const sortedSubmissions = [...(gradeSubmissionsView.detailsData || [])].sort((a, b) => {
      if (gradeSubmissionsSortBy === 'date') {
        return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
      } else if (gradeSubmissionsSortBy === 'name') {
        return (a.memberName || '').localeCompare(b.memberName || '');
      } else if (gradeSubmissionsSortBy === 'status') {
        const statusOrder = { pending: 1, revision: 2, approved: 3 };
        return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      }
      return 0;
    });

    // First, group submissions - show only the latest version of each original submission
    // This must be done BEFORE filtering by grade status to ensure we check the entire group
    const groupedSubmissions = {};
    const allSubmissionsData = gradeSubmissionsView.detailsData || [];
    
    allSubmissionsData.forEach(submission => {
      // Use original_submission_id as group key if it's a resubmission, otherwise use the submission id
      const groupKey = submission.is_resubmission && submission.original_submission_id 
        ? submission.original_submission_id 
        : submission.id;
      
      if (!groupedSubmissions[groupKey]) {
        groupedSubmissions[groupKey] = submission;
      } else {
        // Keep the resubmission if this is newer, otherwise keep existing
        const existing = groupedSubmissions[groupKey];
        if (submission.is_resubmission && !existing.is_resubmission) {
          // Resubmission replaces original in display
          groupedSubmissions[groupKey] = submission;
        } else if (submission.is_resubmission && existing.is_resubmission) {
          // Keep the one with higher resubmission number
          if ((submission.resubmission_number || 0) > (existing.resubmission_number || 0)) {
            groupedSubmissions[groupKey] = submission;
          }
        }
      }
    });
    
    // Now check grading status for the entire group (all versions - original + resubmissions)
    const getGroupGradingStatus = (groupKey) => {
      // Check if ANY version in this group is graded
      const allVersionsInGroup = allSubmissionsData.filter(sub => {
        const key = sub.is_resubmission && sub.original_submission_id 
          ? sub.original_submission_id 
          : sub.id;
        return key === groupKey;
      });
      
      // If any version is graded, consider the entire group as graded
      return allVersionsInGroup.some(sub => sub.grade !== null && sub.grade !== undefined);
    };

    // Filter the grouped submissions based on type, search, and grade status
    const filteredGroupKeys = Object.keys(groupedSubmissions).filter(groupKey => {
      const submission = groupedSubmissions[groupKey];
      
      // Filter by type (phase or project) - if 'all', show both
      const matchesType = activeSubmissionFilter === 'all' ? true : 
                          activeSubmissionFilter === 'phase' ? (submission.submissionType === 'phase' || !submission.submissionType) : 
                          (submission.submissionType === 'project' || !submission.submissionType);
      
      // Filter by search query
      const matchesSearch = !gradeSearchQuery || 
        (submission.attempts && submission.attempts.length > 0 && 
         submission.attempts[submission.attempts.length - 1].memberName?.toLowerCase().includes(gradeSearchQuery.toLowerCase()));
      
      // Filter by grade status - CHECK IF ANY VERSION IN THE GROUP IS GRADED
      const isGroupGraded = getGroupGradingStatus(groupKey);
      const matchesGradeStatus = 
        gradeFilterStatus === 'all' ||
        (gradeFilterStatus === 'graded' && isGroupGraded) ||
        (gradeFilterStatus === 'ungraded' && !isGroupGraded);
      
      return matchesType && matchesSearch && matchesGradeStatus;
    });

    const filteredSubmissions = filteredGroupKeys.map(key => groupedSubmissions[key]);
    
    console.log('🔍 Filtering submissions for grouping:', {
      totalSubmissions: filteredSubmissions.length,
      sampleSubmission: filteredSubmissions[0] ? {
        id: filteredSubmissions[0].id,
        is_resubmission: filteredSubmissions[0].is_resubmission,
        isResubmission: filteredSubmissions[0].isResubmission,
        original_submission_id: filteredSubmissions[0].original_submission_id,
        originalSubmissionId: filteredSubmissions[0].originalSubmissionId
      } : 'none'
    });
    
    const uniqueSubmissions = filteredSubmissions;
    
    console.log('📊 Grouping result:', {
      before: allSubmissionsData.length,
      after: uniqueSubmissions.length,
      groups: Object.keys(groupedSubmissions).length
    });

    // Sort the grouped submissions
    const sortedAndFilteredSubmissions = [...uniqueSubmissions].sort((a, b) => {
      if (gradeSortBy === 'recent') {
        return new Date(b.attempts?.[b.attempts.length - 1]?.submittedAt || 0) - 
               new Date(a.attempts?.[a.attempts.length - 1]?.submittedAt || 0);
      } else if (gradeSortBy === 'group') {
        const aName = a.attempts?.[a.attempts.length - 1]?.memberName || '';
        const bName = b.attempts?.[b.attempts.length - 1]?.memberName || '';
        return aName.localeCompare(bName);
      }
      return 0;
    });

    return (
      <div style={{ padding: '2rem', width: '100%', margin: '0 auto' }}>
        {/* Main Content - Two Column Layout */}
        {gradeSubmissionsView.loading ? (
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '60px 20px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px'
          }}>
            <FaSpinner style={{ 
              fontSize: '48px', 
              color: '#872341',
              animation: 'spin 1s linear infinite' 
            }} />
            <span style={{ 
              color: '#6B7280',
              fontSize: '16px',
              fontWeight: '500'
            }}>
              Loading submission data...
            </span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '1.5rem', maxWidth: '100%' }}>
            {/* Left Column - Submissions List */}
            <div style={{
              position: 'relative',
              background: 'rgba(9, 18, 44, 0.15)',
              border: '0.1px solid rgb(95, 95, 95)',
              borderRadius: '0px',
              boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
              backdropFilter: 'blur(3.2px) saturate(120%)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '700px',
              minHeight: '700px',
              maxHeight: '700px'
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

              {/* Header with Filter Dropdown */}
              <div style={{
                padding: '1.5rem 1.5rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                backgroundColor: 'rgb(255, 255, 255)'
              }}>
                <h3 style={{
                  color: 'rgb(135, 35, 65)',
                  fontWeight: '700',
                  margin: '0px',
                  fontSize: '1.1rem',
                  whiteSpace: 'nowrap'
                }}>Submissions ({sortedAndFilteredSubmissions.length})</h3>
                
                {/* Filter Dropdown - Ungraded/Graded/All */}
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowGradeFilterDropdown(!showGradeFilterDropdown)}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: 'white',
                      border: '1.5px solid rgb(135, 35, 65)',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'rgb(135, 35, 65)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease',
                      minWidth: '120px',
                      justifyContent: 'space-between'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(135, 35, 65, 0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <span style={{ textTransform: 'capitalize' }}>
                      {gradeFilterStatus === 'ungraded' ? 'Ungraded' : gradeFilterStatus === 'graded' ? 'Graded' : 'All'}
                    </span>
                    <FaChevronDown style={{ 
                      fontSize: '10px',
                      transition: 'transform 0.2s ease',
                      transform: showGradeFilterDropdown ? 'rotate(180deg)' : 'rotate(0deg)'
                    }} />
                  </button>
                  {showGradeFilterDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      backgroundColor: 'rgb(135, 35, 65)',
                      border: '1.5px solid rgb(135, 35, 65)',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(135, 35, 65, 0.3)',
                      zIndex: 10000,
                      minWidth: '140px',
                      overflow: 'hidden'
                    }}>
                      {[
                        { value: 'ungraded', label: 'Ungraded' },
                        { value: 'graded', label: 'Graded' },
                        { value: 'all', label: 'All' }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setGradeFilterStatus(option.value);
                            setShowGradeFilterDropdown(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.75rem 1rem',
                            background: gradeFilterStatus === option.value ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                            color: 'white',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.813rem',
                            fontWeight: gradeFilterStatus === option.value ? '700' : '600',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                          onMouseLeave={(e) => e.target.style.background = gradeFilterStatus === option.value ? 'rgba(255, 255, 255, 0.2)' : 'transparent'}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Search and Sort Section */}
              <div style={{
                padding: '0 1.5rem 1rem',
                backgroundColor: 'rgb(255, 255, 255)',
                display: 'flex',
                gap: '0.5rem'
              }}>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  flex: 1
                }}>
                  <FaSearch size={13} style={{
                    position: 'absolute',
                    left: '0.75rem',
                    color: 'rgb(135, 35, 65)',
                    pointerEvents: 'none',
                    zIndex: 1
                  }} />
                  <input
                    type="text"
                    placeholder="Search by group name..."
                    value={gradeSearchQuery}
                    onChange={(e) => setGradeSearchQuery(e.target.value)}
                    ref={(el) => {
                      if (el) {
                        el.style.setProperty('background', 'white', 'important');
                        el.style.setProperty('color', 'rgb(50, 50, 50)', 'important');
                        el.style.setProperty('border', '1.5px solid rgb(135, 35, 65)', 'important');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.5rem',
                      borderRadius: '6px',
                      fontSize: '0.813rem',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                      fontWeight: '500'
                    }}
                    onFocus={(e) => {
                      e.target.style.setProperty('border', '1.5px solid rgb(135, 35, 65)', 'important');
                      e.target.style.boxShadow = '0 0 0 3px rgba(135, 35, 65, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.setProperty('border', '1.5px solid rgb(135, 35, 65)', 'important');
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowGradeSortDropdown(!showGradeSortDropdown)}
                    style={{
                      padding: '0.6rem 1rem',
                      backgroundColor: 'white',
                      border: '1.5px solid rgb(135, 35, 65)',
                      borderRadius: '6px',
                      fontSize: '0.813rem',
                      fontWeight: '500',
                      color: 'rgb(135, 35, 65)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(135, 35, 65, 0.05)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    <FaSort style={{ fontSize: '12px' }} />
                    <FaChevronDown style={{ fontSize: '8px' }} />
                  </button>
                  {showGradeSortDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '0.5rem',
                      backgroundColor: 'rgb(135, 35, 65)',
                      border: '1.5px solid rgb(135, 35, 65)',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(135, 35, 65, 0.3)',
                      zIndex: 10000,
                      minWidth: '180px',
                      overflow: 'hidden'
                    }}>
                      {[
                        { value: 'recent', label: 'Most Recent' },
                        { value: 'group', label: 'By Group' }
                      ].map(option => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setGradeSortBy(option.value);
                            setShowGradeSortDropdown(false);
                          }}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '0.75rem 1rem',
                            background: gradeSortBy === option.value ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                            color: 'white',
                            border: 'none',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            fontWeight: gradeSortBy === option.value ? '700' : '600',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
                          onMouseLeave={(e) => e.target.style.background = gradeSortBy === option.value ? 'rgba(255, 255, 255, 0.2)' : 'transparent'}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Submissions List */}
              <div style={{
                padding: '1rem',
                flex: '1 1 0%',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {sortedAndFilteredSubmissions.length > 0 ? (
                  sortedAndFilteredSubmissions.map((submission, index) => {
                    const latestAttempt = submission.attempts && submission.attempts.length > 0 
                      ? submission.attempts[submission.attempts.length - 1] 
                      : null;
                    const isSelected = gradeSubmissionsView.selectedTask?.taskId === submission.taskId;
                    const isGraded = submission.grade !== null && submission.grade !== undefined;
                    
                    return (
                      <div
                        key={index}
                        onClick={() => {
                          setGradeSubmissionsView(prev => ({
                            ...prev,
                            selectedTask: submission,
                            selectedAttempt: latestAttempt,
                            selectedSubmission: submission
                          }));
                          console.log('📋 Selected submission set:', {
                            id: submission.id,
                            type: submission.type,
                            projectSnapshot: submission.projectSnapshot,
                            phaseSnapshot: submission.phaseSnapshot,
                            hasMAXATTEMPT: !!submission.projectSnapshot?.MAXATTEMPT,
                            MAXATTEMPT: submission.projectSnapshot?.MAXATTEMPT,
                            allProjectSnapshotKeys: submission.projectSnapshot ? Object.keys(submission.projectSnapshot) : [],
                            allPhaseSnapshotKeys: submission.phaseSnapshot ? Object.keys(submission.phaseSnapshot) : [],
                            projectSnapshotContent: JSON.stringify(submission.projectSnapshot, null, 2),
                            phaseSnapshotContent: JSON.stringify(submission.phaseSnapshot, null, 2)
                          });
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          padding: '0.75rem',
                          borderRadius: '0px',
                          background: isSelected ? 'rgb(245, 245, 245)' : 'rgb(255, 255, 255)',
                          border: isSelected ? '2px solid rgb(135, 35, 65)' : 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: 'rgba(0, 0, 0, 0.15) 0px 2px 6px',
                          position: 'relative'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.boxShadow = '0px 4px 12px rgba(0, 0, 0, 0.25)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.boxShadow = '0px 2px 6px rgba(0, 0, 0, 0.15)';
                            e.currentTarget.style.transform = 'translateY(0px)';
                          }
                        }}
                      >
                        {/* Submission Type Pill - Top Right */}
                        <div style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          fontSize: '0.625rem',
                          fontWeight: '700',
                          padding: '0.25rem 0.625rem',
                          borderRadius: '12px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          background: submission.submissionType === 'phase' ? 'rgb(191, 219, 254)' : 'rgb(217, 119, 6)',
                          color: submission.submissionType === 'phase' ? 'rgb(30, 58, 138)' : 'white'
                        }}>
                          {submission.submissionType === 'phase' ? 'Phase' : 'Project'}
                        </div>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          background: isGraded ? 'rgb(34, 197, 94)' : 'rgb(249, 115, 22)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '700',
                          fontSize: '0.75rem',
                          flexShrink: 0
                        }}>
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: 'rgb(50, 50, 50)',
                            margin: '0 0 0.25rem 0',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {submission.submissionType === 'phase' 
                              ? `Phase ${submission.phaseNumber}${submission.phaseTitle ? ` - ${submission.phaseTitle}` : ''}`
                              : `${submission.projectTitle || 'Project Submission'}`
                            }
                          </p>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: '500',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              background: 'rgb(224, 231, 255)',
                              color: 'rgb(55, 48, 163)'
                            }}>
                              {latestAttempt?.memberName || 'Unknown Group'}
                            </span>
                            <span style={{
                              fontSize: '0.625rem',
                              fontWeight: '500',
                              padding: '0.125rem 0.5rem',
                              borderRadius: '9999px',
                              background: isGraded ? 'rgb(220, 252, 231)' : 'rgb(254, 249, 195)',
                              color: isGraded ? 'rgb(22, 101, 52)' : 'rgb(113, 63, 18)'
                            }}>
                              {isGraded ? `Graded: ${submission.grade}` : 'Ungraded'}
                            </span>
                            {latestAttempt?.submittedAt && (
                              <span style={{
                                fontSize: '0.625rem',
                                fontWeight: '500',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '9999px',
                                background: 'rgb(243, 244, 246)',
                                color: 'rgb(75, 85, 99)'
                              }}>
                                {new Date(latestAttempt.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p style={{
                    color: 'rgba(100, 100, 100, 0.7)',
                    textAlign: 'center',
                    padding: '2rem'
                  }}>
                    {gradeSearchQuery ? 'No results found' : 'No submissions'}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column - Submission Details Card */}
            <div style={{
              position: 'relative',
              background: gradeSubmissionsView.selectedSubmission ? 'white' : 'rgba(9, 18, 44, 0.15)',
              border: '0.1px solid rgb(95, 95, 95)',
              borderRadius: '0px',
              boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
              backdropFilter: gradeSubmissionsView.selectedSubmission ? 'none' : 'blur(3.2px) saturate(120%)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              height: '700px',
              minHeight: '700px',
              maxHeight: '700px',
              width: '100%',
              flex: '1'
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

              {gradeSubmissionsView.selectedSubmission ? (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto' }}>
                  {/* ========== SECTION 1: HEADER & SUBMISSION DETAILS ========== */}
                  <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
                    {/* Header with Task Title and Status */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: '24px',
                      paddingBottom: '20px',
                      borderBottom: '2px solid #F3F4F6',
                      gap: '16px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '24px', fontWeight: '700', color: '#1F2937', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          {(() => {
                            const submission = gradeSubmissionsView.selectedSubmission;
                            const selectedProject = gradeSubmissionsView.selectedProject;
                            // Try multiple sources for project name in priority order
                            const projectName = selectedProject?.title 
                              || selectedProject?.name 
                              || submission?.projectSnapshot?.title 
                              || submission?.projectSnapshot?.name 
                              || submission?.projectSnapshot?.projectName
                              || submission?.phaseSnapshot?.projectTitle
                              || selectedProject?.projectName
                              || 'Unknown Project';
                            const isPhaseSubmission = submission?.type === 'phase' || submission?.submissionType === 'phase';
                            
                            if (isPhaseSubmission) {
                              const phaseName = submission?.phaseSnapshot?.title 
                                || submission?.phaseSnapshot?.name 
                                || submission?.phaseTitle 
                                || submission?.phaseName
                                || 'Unknown Phase';
                              const phaseNumber = submission?.phaseNumber || submission?.phaseSnapshot?.number || submission?.phaseSnapshot?.phaseNumber || '1';
                              return `Project: ${projectName} - Phase ${phaseNumber}: ${phaseName} Submission`;
                            } else {
                              return `Project: ${projectName} Submission`;
                            }
                          })()}
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: '#6B7280',
                            backgroundColor: '#F3F4F6',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>
                            {(() => {
                              const current = gradeSubmissionsView.selectedSubmission;
                              const attemptNum = current.is_resubmission ? (current.resubmission_number || 0) + 1 : 1;
                              const ordinal = attemptNum === 1 ? '1st' : attemptNum === 2 ? '2nd' : attemptNum === 3 ? '3rd' : `${attemptNum}th`;
                              return `${ordinal} Attempt`;
                            })()}
                          </span>
                        </h3>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '14px',
                          color: '#6B7280'
                        }}>
                          <span style={{ fontWeight: '500' }}>Submitted by:</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {gradeSubmissionsView.selectedAttempt?.memberProfileImage || gradeSubmissionsView.selectedSubmission?.submittedBy?.profileImage ? (
                              <img 
                                src={getSupabaseImageUrl(gradeSubmissionsView.selectedAttempt?.memberProfileImage || gradeSubmissionsView.selectedSubmission?.submittedBy?.profileImage)}
                                alt={gradeSubmissionsView.selectedAttempt?.memberName || gradeSubmissionsView.selectedSubmission?.groupName}
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '2px solid #E5E7EB'
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                backgroundColor: '#34656D',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '600'
                              }}>
                                {(gradeSubmissionsView.selectedAttempt?.memberName || gradeSubmissionsView.selectedSubmission?.groupName)?.charAt(0) || '?'}
                              </div>
                            )}
                            <span style={{ fontWeight: '600', color: '#374151' }}>
                              {(() => {
                                const groupName = gradeSubmissionsView.selectedSubmission?.groupName || 'Unknown Group';
                                const memberTasks = gradeSubmissionsView.selectedSubmission?.memberTasks || [];
                                const leader = memberTasks.find(task => task.role === 'leader');
                                const leaderName = leader?.member_name || 'No Leader';
                                return `${groupName} (Leader): ${leaderName}`;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge and Attempt Selector */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                          backgroundColor: 
                            gradeSubmissionsView.selectedSubmission.grade !== null && gradeSubmissionsView.selectedSubmission.grade !== undefined ? '#D1FAE5' :
                            '#FEF3C7',
                          color:
                            gradeSubmissionsView.selectedSubmission.grade !== null && gradeSubmissionsView.selectedSubmission.grade !== undefined ? '#059669' :
                            '#D97706'
                        }}>
                          {gradeSubmissionsView.selectedSubmission.grade !== null && gradeSubmissionsView.selectedSubmission.grade !== undefined ? (
                            <>
                              <FaCheckCircle style={{ fontSize: '12px' }} />
                              Graded
                            </>
                          ) : (
                            <>
                              <FaClock style={{ fontSize: '12px' }} />
                              Ungraded
                            </>
                          )}
                        </span>
                        
                        {/* Attempt Dropdown */}
                        {(() => {
                          const current = gradeSubmissionsView.selectedSubmission;
                          // Get max_attempts from phase or project
                          const maxAttempts = current.phaseSnapshot?.max_attempts || 
                                             current.projectSnapshot?.MAXATTEMPT ||
                                             current.projectSnapshot?.max_attempts || 
                                             3;
                          
                          // Get all attempts for this group (original + resubmissions)
                          const allAttempts = gradeSubmissionsView.detailsData.filter(sub => {
                            if (current.is_resubmission) {
                              // If current is resubmission, match by original_submission_id
                              return sub.id === current.original_submission_id || 
                                     sub.original_submission_id === current.original_submission_id;
                            } else {
                              // If current is original, match by id
                              return sub.id === current.id || sub.original_submission_id === current.id;
                            }
                          }).filter(sub => {
                            // Filter by max_attempts (resubmission_number + 1 for original)
                            const attemptNumber = sub.is_resubmission ? (sub.resubmission_number || 0) + 1 : 1;
                            return attemptNumber <= maxAttempts;
                          }).sort((a, b) => {
                            // Sort by attempt number descending (latest first)
                            const aNum = a.is_resubmission ? (a.resubmission_number || 0) + 1 : 1;
                            const bNum = b.is_resubmission ? (b.resubmission_number || 0) + 1 : 1;
                            return bNum - aNum;
                          });
                          
                          // Only show dropdown if there are multiple attempts
                          if (allAttempts.length <= 1) return null;
                          
                          const currentAttemptNum = current.is_resubmission ? (current.resubmission_number || 0) + 1 : 1;
                          
                          return (
                            <select
                              id="gradeSubmissionAttemptDropdown"
                              value={current.id}
                              onChange={(e) => {
                                const selectedId = e.target.value;
                                const targetSubmission = gradeSubmissionsView.detailsData.find(s => s.id === selectedId);
                                if (targetSubmission) {
                                  setGradeSubmissionsView(prev => ({
                                    ...prev,
                                    selectedSubmission: targetSubmission
                                  }));
                                }
                              }}
                            >
                              {allAttempts.map(attempt => {
                                const attemptNum = attempt.is_resubmission ? (attempt.resubmission_number || 0) + 1 : 1;
                                const ordinal = attemptNum === 1 ? '1st' : attemptNum === 2 ? '2nd' : attemptNum === 3 ? '3rd' : `${attemptNum}th`;
                                return (
                                  <option key={attempt.id} value={attempt.id}>
                                    {ordinal} Attempt - {new Date(attempt.submitted_at).toLocaleDateString()}
                                  </option>
                                );
                              })}
                            </select>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Submission Info Grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '16px',
                      marginBottom: '24px'
                    }}>
                      {/* Submitted On */}
                      <div style={{
                        backgroundColor: '#F9FAFB',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: '#6B7280',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '8px'
                        }}>
                          Submitted On
                        </div>
                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                          {gradeSubmissionsView.selectedAttempt?.submittedAt || gradeSubmissionsView.selectedSubmission?.submittedAt
                            ? new Date(gradeSubmissionsView.selectedAttempt?.submittedAt || gradeSubmissionsView.selectedSubmission?.submittedAt).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'N/A'
                          }
                        </div>
                      </div>

                      {/* Submission Type */}
                      <div style={{
                        backgroundColor: '#F9FAFB',
                        padding: '16px',
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB'
                      }}>
                        <div style={{
                          fontSize: '11px',
                          color: '#6B7280',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          marginBottom: '8px'
                        }}>
                          Type
                        </div>
                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600', textTransform: 'capitalize' }}>
                          {gradeSubmissionsView.selectedTask?.submissionType === 'phase' ? 'Phase Submission' : 'Project Submission'}
                        </div>
                      </div>

                      {/* Phase Name - Only for phase submissions */}
                      {gradeSubmissionsView.selectedTask?.submissionType === 'phase' && gradeSubmissionsView.selectedSubmission?.phaseSnapshot && (
                        <div style={{
                          backgroundColor: '#F9FAFB',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            color: '#6B7280',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px'
                          }}>
                            Phase
                          </div>
                          <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                            {gradeSubmissionsView.selectedSubmission.phaseSnapshot.title || gradeSubmissionsView.selectedSubmission.phaseSnapshot.name || gradeSubmissionsView.selectedSubmission.phaseSnapshot.phase_name || 'N/A'}
                          </div>
                        </div>
                      )}

                      {/* Max Attempts */}
                      {(gradeSubmissionsView.selectedSubmission?.phaseSnapshot || gradeSubmissionsView.selectedSubmission?.projectSnapshot) && (
                        <div style={{
                          backgroundColor: '#F9FAFB',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            color: '#6B7280',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px'
                          }}>
                            Max Attempts
                          </div>
                          <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                            {(() => {
                              const phaseMax = gradeSubmissionsView.selectedSubmission?.phaseSnapshot?.max_attempts;
                              const projectMax1 = gradeSubmissionsView.selectedSubmission?.projectSnapshot?.MAXATTEMPT;
                              const projectMax2 = gradeSubmissionsView.selectedSubmission?.projectSnapshot?.max_attempts;
                              
                              // Debug logging
                              if (gradeSubmissionsView.selectedSubmission?.type === 'project') {
                                console.log('🔍 [Max Attempts Debug] Project Submission:', {
                                  phaseMax,
                                  projectMax1,
                                  projectMax2,
                                  projectSnapshot: gradeSubmissionsView.selectedSubmission?.projectSnapshot,
                                  allKeys: gradeSubmissionsView.selectedSubmission?.projectSnapshot ? Object.keys(gradeSubmissionsView.selectedSubmission.projectSnapshot) : []
                                });
                              }
                              
                              return phaseMax || projectMax1 || projectMax2 || 'N/A';
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Due Date - Only for phase submissions */}
                      {gradeSubmissionsView.selectedTask?.submissionType === 'phase' && gradeSubmissionsView.selectedSubmission?.phaseSnapshot && (
                        <div style={{
                          backgroundColor: '#F9FAFB',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            color: '#6B7280',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px'
                          }}>
                            End Date
                          </div>
                          <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                            {gradeSubmissionsView.selectedSubmission.phaseSnapshot.end_date || gradeSubmissionsView.selectedSubmission.phaseSnapshot.due_date ? 
                              new Date(gradeSubmissionsView.selectedSubmission.phaseSnapshot.end_date || gradeSubmissionsView.selectedSubmission.phaseSnapshot.due_date).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })
                              : 'N/A'
                            }
                          </div>
                        </div>
                      )}

                      {/* Min Tasks Per Member - Only for phase submissions */}
                      {gradeSubmissionsView.selectedTask?.submissionType === 'phase' && gradeSubmissionsView.selectedSubmission?.phaseSnapshot && (
                        <div style={{
                          backgroundColor: '#F9FAFB',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            color: '#6B7280',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px'
                          }}>
                            Min Tasks Per Member
                          </div>
                          <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                            {gradeSubmissionsView.selectedSubmission.phaseSnapshot.min_tasks_per_member || gradeSubmissionsView.selectedSubmission.phaseSnapshot.min_tasks_per_member === 0 
                              ? gradeSubmissionsView.selectedSubmission.phaseSnapshot.min_tasks_per_member
                              : 'N/A'
                            }
                          </div>
                        </div>
                      )}

                      {/* Max Tasks Per Member - Only for phase submissions */}
                      {gradeSubmissionsView.selectedTask?.submissionType === 'phase' && gradeSubmissionsView.selectedSubmission?.phaseSnapshot && (
                        <div style={{
                          backgroundColor: '#F9FAFB',
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #E5E7EB'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            color: '#6B7280',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px'
                          }}>
                            Max Tasks Per Member
                          </div>
                          <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                            {gradeSubmissionsView.selectedSubmission.phaseSnapshot.max_tasks_per_member || gradeSubmissionsView.selectedSubmission.phaseSnapshot.max_tasks_per_member === 0
                              ? gradeSubmissionsView.selectedSubmission.phaseSnapshot.max_tasks_per_member
                              : 'N/A'
                            }
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Submission Text/Description */}
                    {gradeSubmissionsView.selectedSubmission.submissionText && (
                      <div style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '24px',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-start'
                      }}>
                        <div style={{
                          flexShrink: 0,
                          fontSize: '18px',
                          color: '#6B7280',
                          marginTop: '2px'
                        }}>
                          <FaFileAlt />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{
                            fontSize: '11px',
                            color: '#6B7280',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            marginBottom: '8px'
                          }}>
                            Description
                          </div>
                          <p style={{ margin: '0', color: '#374151', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {gradeSubmissionsView.selectedSubmission.submissionText}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Files Section */}
                    <div>
                      <div style={{
                        fontSize: '11px',
                        color: '#6B7280',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        marginBottom: '12px'
                      }}>
                        Attached Files
                      </div>
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {getFileUrlsArray(gradeSubmissionsView.selectedSubmission.fileUrls).length > 0 ? (
                          getFileUrlsArray(gradeSubmissionsView.selectedSubmission.fileUrls).map((file, idx) => {
                            const fileUrl = typeof file === 'object' ? file.url : file;
                            const fileName = typeof file === 'object' && file.name ? file.name : (typeof fileUrl === 'string' ? fileUrl.split('/').pop() : `File ${idx + 1}`);
                            
                            return (
                            <div
                              key={idx}
                              onClick={() => downloadSubmissionFile(fileUrl, fileName)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                backgroundColor: '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#F0FDFB';
                                e.currentTarget.style.borderColor = '#34656D';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = '#F9FAFB';
                                e.currentTarget.style.borderColor = '#E5E7EB';
                              }}
                            >
                              <FaFile style={{ color: '#34656D', fontSize: '14px', flexShrink: 0 }} />
                              <span style={{
                                flex: 1,
                                fontSize: '13px',
                                fontWeight: '500',
                                color: '#374151',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}>
                                {fileName}
                              </span>
                              <FaDownload style={{ color: '#34656D', fontSize: '12px', flexShrink: 0 }} />
                            </div>
                          );
                          })
                        ) : (
                          <div style={{
                            padding: '16px',
                            backgroundColor: '#F9FAFB',
                            border: '1px solid #E5E7EB',
                            borderRadius: '6px',
                            color: '#9CA3AF',
                            fontSize: '13px',
                            textAlign: 'center'
                          }}>
                            No files attached
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ========== SECTION 2: MEMBER SUBMISSIONS ========== */}
                  <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', marginBottom: '24px', margin: '0 0 24px 0' }}>
                      Member Submissions
                    </h3>
                    <div style={{
                      display: 'flex',
                      gap: '24px',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}>
                      {/* Cards Container */}
                      <div style={{
                        display: 'flex',
                        gap: '24px',
                        flexWrap: 'nowrap',
                        flex: 1,
                        overflowX: 'auto',
                        paddingRight: '60px'
                      }}>
                        {groupMembers
                          .slice(memberPage * 3, (memberPage * 3) + 3)
                          .map((member) => {
                          const memberId = member.student_id || member.id;
                          const memberName = member.full_name || member.name || 'Unknown';
                          const memberInitial = memberName.charAt(0).toUpperCase();
                          const memberTaskList = memberTasks[memberId] || [];
                          const isLeader = member.role === 'leader';

                          return (
                            <div
                              key={memberId}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '24px',
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                minWidth: '270px',
                                textAlign: 'center',
                                boxShadow: isLeader ? '0 4px 12px rgba(52, 101, 109, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                flexShrink: 0
                              }}
                            >
                              {/* Tasks Counter Pill - Top Right */}
                              <div style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 14px',
                                backgroundColor: memberTaskList.length >= (selectedSubmissionData?.phaseSnapshot?.max_tasks_per_member || 3) ? '#D1FAE5' : '#FEF3C7',
                                border: memberTaskList.length >= (selectedSubmissionData?.phaseSnapshot?.max_tasks_per_member || 3) ? '1px solid #6EE7B7' : '1px solid #FCD34D',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: memberTaskList.length >= (selectedSubmissionData?.phaseSnapshot?.max_tasks_per_member || 3) ? '#047857' : '#B45309'
                              }}>
                                <FaTasks size={13} />
                                <span>{memberTaskList.length}/{selectedSubmissionData?.phaseSnapshot?.max_tasks_per_member || 3}</span>
                              </div>

                              {/* Profile Picture */}
                              <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '8px',
                                backgroundColor: '#34656D',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '40px',
                                fontWeight: '600',
                                overflow: 'hidden'
                              }}>
                                {member.profile_image_url && member.profile_image_url.trim() ? (
                                  <img
                                    src={getSupabaseImageUrl(member.profile_image_url)}
                                    alt={memberName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : null}
                                {!member.profile_image_url || !member.profile_image_url.trim() ? (
                                  <span>{memberInitial}</span>
                                ) : null}
                              </div>

                              {/* Position */}
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                {isLeader ? 'Leader' : 'Member'}
                              </div>

                              {/* Name */}
                              <div style={{
                                fontSize: '15px',
                                fontWeight: '700',
                                color: '#2c3e50',
                                wordBreak: 'break-word',
                                maxWidth: '160px',
                                lineHeight: '1.2'
                              }}>
                                {memberName}
                              </div>

                              {/* Tasks List - Grouped by Phase */}
                              <div style={{
                                width: '100%',
                                borderTop: '1px solid #e5e7eb',
                                paddingTop: '12px',
                                marginTop: '8px'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#2c3e50',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  marginBottom: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}>
                                  <FaTasks size={12} />
                                  Assigned Tasks ({memberTaskList.length})
                                </div>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px'
                                }}>
                                  {memberTaskList.length > 0 ? (() => {
                                    // Group tasks by phase
                                    const tasksByPhase = {};
                                    memberTaskList.forEach(task => {
                                      const phaseKey = task.phase_id || `phase-${task.phase_number || 'unknown'}`;
                                      const phaseTitle = task.phase_title || `Phase ${task.phase_number || '?'}`;
                                      if (!tasksByPhase[phaseKey]) {
                                        tasksByPhase[phaseKey] = {
                                          phaseId: phaseKey,
                                          phaseTitle: phaseTitle,
                                          phaseNumber: task.phase_number || 0,
                                          tasks: []
                                        };
                                      }
                                      tasksByPhase[phaseKey].tasks.push(task);
                                    });

                                    // Sort phases by phase number
                                    const sortedPhases = Object.values(tasksByPhase).sort((a, b) => a.phaseNumber - b.phaseNumber);

                                    // Helper function to render task card
                                    const renderTaskCard = (task, key, hasSubmission) => {
                                      return (
                                        <div
                                          key={key}
                                          style={{
                                            backgroundColor: '#FFFFFF',
                                            border: '2px solid #E5F3FF',
                                            borderRadius: '10px',
                                            padding: '16px 18px',
                                            fontSize: '13px',
                                            color: '#1F2937',
                                            textAlign: 'left',
                                            lineHeight: '1.6',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s ease',
                                            position: 'relative',
                                            minHeight: '70px',
                                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                            display: 'flex',
                                            flexDirection: 'column'
                                          }}
                                          title={task.title}
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.borderColor = '#10B981';
                                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.1)';
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.borderColor = '#E5F3FF';
                                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                                          }}
                                        >
                                          {/* Attempt Selector Dropdown */}
                                          {task.allAttempts && task.allAttempts.length > 1 && (
                                            <div style={{ 
                                              marginBottom: '12px', 
                                              padding: '8px 10px',
                                              backgroundColor: '#F9FAFB',
                                              border: '1px solid #E5E7EB',
                                              borderRadius: '6px'
                                            }}>
                                              <label style={{ 
                                                fontSize: '10px', 
                                                fontWeight: '700', 
                                                color: '#6B7280',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.5px',
                                                display: 'block',
                                                marginBottom: '6px'
                                              }}>
                                                View Attempt
                                              </label>
                                              <div style={{ position: 'relative' }}>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const dropdownId = `attempt-dropdown-${task.id}`;
                                                    const dropdown = document.getElementById(dropdownId);
                                                    if (dropdown) {
                                                      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
                                                    }
                                                  }}
                                                  style={{
                                                    width: '100%',
                                                    padding: '8px 12px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    backgroundColor: '#7C3AED',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    transition: 'all 0.2s ease'
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    e.target.style.backgroundColor = '#6D28D9';
                                                    e.target.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.3)';
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.target.style.backgroundColor = '#7C3AED';
                                                    e.target.style.boxShadow = 'none';
                                                  }}
                                                >
                                                  <span>
                                                    {task.allAttempts[task.currentAttemptIndex]?.status === 'approved' && '✓ '}
                                                    {task.allAttempts[task.currentAttemptIndex]?.status === 'revision_requested' && '↻ '}
                                                    {(task.allAttempts[task.currentAttemptIndex]?.status === 'submitted' || task.allAttempts[task.currentAttemptIndex]?.status === 'pending') && '⏱ '}
                                                    Attempt {task.currentAttemptIndex + 1}
                                                  </span>
                                                  <span style={{ fontSize: '14px' }}>▼</span>
                                                </button>
                                                
                                                {/* Custom Dropdown Menu */}
                                                <div
                                                  id={`attempt-dropdown-${task.id}`}
                                                  style={{
                                                    display: 'none',
                                                    position: 'absolute',
                                                    top: '100%',
                                                    left: 0,
                                                    right: 0,
                                                    backgroundColor: 'white',
                                                    border: '1px solid #D1D5DB',
                                                    borderRadius: '6px',
                                                    marginTop: '4px',
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                                    zIndex: 1000,
                                                    maxHeight: '200px',
                                                    overflowY: 'auto'
                                                  }}
                                                >
                                                  {task.allAttempts.map((attempt, idx) => {
                                                    let statusLabel = '';
                                                    let statusIcon = '';
                                                    let statusColor = '#6B7280';
                                                    
                                                    if (attempt.status === 'approved') {
                                                      statusLabel = 'Approved';
                                                      statusIcon = '✓';
                                                      statusColor = '#10B981';
                                                    } else if (attempt.status === 'revision_requested') {
                                                      statusLabel = 'Needs Revision';
                                                      statusIcon = '↻';
                                                      statusColor = '#F59E0B';
                                                    } else if (attempt.status === 'submitted' || attempt.status === 'pending') {
                                                      statusLabel = 'Pending Review';
                                                      statusIcon = '⏱';
                                                      statusColor = '#3B82F6';
                                                    } else {
                                                      statusLabel = 'Submitted';
                                                      statusIcon = '📄';
                                                      statusColor = '#6B7280';
                                                    }

                                                    return (
                                                      <button
                                                        key={idx}
                                                        onClick={() => {
                                                          setSelectedAttempts({
                                                            ...selectedAttempts,
                                                            [task.id]: idx
                                                          });
                                                          const dropdownId = `attempt-dropdown-${task.id}`;
                                                          const dropdown = document.getElementById(dropdownId);
                                                          if (dropdown) {
                                                            dropdown.style.display = 'none';
                                                          }
                                                        }}
                                                        style={{
                                                          width: '100%',
                                                          padding: '10px 12px',
                                                          textAlign: 'left',
                                                          backgroundColor: idx === task.currentAttemptIndex ? 'rgba(124, 58, 237, 0.1)' : 'white',
                                                          border: 'none',
                                                          borderBottom: idx !== task.allAttempts.length - 1 ? '1px solid #F3F4F6' : 'none',
                                                          cursor: 'pointer',
                                                          fontSize: '12px',
                                                          color: '#1F2937',
                                                          transition: 'all 0.15s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                          e.target.style.backgroundColor = 'rgba(124, 58, 237, 0.08)';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                          e.target.style.backgroundColor = idx === task.currentAttemptIndex ? 'rgba(124, 58, 237, 0.1)' : 'white';
                                                        }}
                                                      >
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                          <span>
                                                            <span style={{ color: statusColor, fontWeight: '600', marginRight: '6px' }}>{statusIcon}</span>
                                                            Attempt {idx + 1}
                                                          </span>
                                                          <span style={{ 
                                                            fontSize: '10px', 
                                                            color: statusColor, 
                                                            fontWeight: '600',
                                                            backgroundColor: statusColor + '20',
                                                            padding: '2px 8px',
                                                            borderRadius: '3px'
                                                          }}>
                                                            {statusLabel}
                                                          </span>
                                                        </div>
                                                      </button>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                          
                                          <div style={{ flex: 1, marginBottom: '50px' }}>
                                            <div style={{ 
                                              fontWeight: '700', 
                                              fontSize: '14px', 
                                              color: '#1F2937', 
                                              marginBottom: '6px'
                                            }}>
                                              {task.title?.length > 13 ? task.title.substring(0, 13) + '...' : task.title}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                                              {task.due_date ? `Due: ${new Date(task.due_date).toLocaleDateString()}` : 'No due date'}
                                            </div>
                                            {task.submittedAt && (
                                              <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '3px' }}>
                                                Submitted: {new Date(task.submittedAt).toLocaleString()}
                                              </div>
                                            )}
                                          </div>
                                          
                                          {/* Download Button - Show only if has submission */}
                                          {hasSubmission && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (task.files && task.files.length > 0) {
                                                  const firstFile = task.files[0];
                                                  // File is already in object format with url and name from extractMemberTasks
                                                  const fileUrl = typeof firstFile === 'object' ? firstFile : firstFile;
                                                  const fileName = typeof firstFile === 'object' && firstFile.name 
                                                    ? firstFile.name 
                                                    : (typeof firstFile === 'string' 
                                                      ? firstFile.split('/').pop() || 'submission_file'
                                                      : 'submission_file');
                                                  
                                                  console.log('📥 Downloading task file:', {
                                                    fileName,
                                                    fileUrl: typeof fileUrl === 'object' ? fileUrl.url : fileUrl,
                                                    taskId: task.id,
                                                    taskTitle: task.title
                                                  });
                                                  downloadSubmissionFile(fileUrl, fileName);
                                                }
                                              }}
                                              style={{
                                                position: 'absolute',
                                                bottom: '8px',
                                                right: '8px',
                                                padding: '6px 10px',
                                                backgroundColor: '#10B981',
                                                border: 'none',
                                                borderRadius: '4px',
                                                color: 'white',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                whiteSpace: 'nowrap',
                                                transition: 'all 0.2s ease',
                                                flexShrink: 0
                                              }}
                                              onMouseEnter={(e) => {
                                                e.target.style.backgroundColor = '#059669';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.target.style.backgroundColor = '#10B981';
                                              }}
                                              title={`Download submission${task.files && task.files.length > 1 ? ` (${task.files.length} files available)` : ''}`}
                                            >
                                              <FaDownload size={10} />
                                              Download
                                            </button>
                                          )}

                                          {task.status && (
                                            <div style={{
                                              position: 'absolute',
                                              top: '8px',
                                              right: '8px',
                                              fontSize: '11px',
                                              fontWeight: '600',
                                              color: getStatusPillColor(task).color,
                                              backgroundColor: getStatusPillColor(task).backgroundColor,
                                              padding: '4px 8px',
                                              borderRadius: '4px',
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              gap: '3px',
                                              whiteSpace: 'nowrap'
                                            }}>
                                              {getStatusPillColor(task).label}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    };

                                    // If only one phase or no phase info, show tasks directly (backward compatibility)
                                    if (sortedPhases.length <= 1 && (!sortedPhases[0] || !sortedPhases[0].phaseId || sortedPhases[0].phaseId.includes('unknown'))) {
                                      return memberTaskList.slice(0, 2).map((task, idx) => {
                                        const hasSubmission = task.files && task.files.length > 0;
                                        return renderTaskCard(task, idx, hasSubmission);
                                      });
                                    }

                                    // Otherwise, group by phase with dropdowns
                                    return sortedPhases.map((phaseGroup, phaseIdx) => {
                                      const isExpanded = expandedMemberPhases[memberId] && expandedMemberPhases[memberId][phaseGroup.phaseId];
                                      return (
                                        <div key={phaseGroup.phaseId} style={{ width: '100%' }}>
                                          <button
                                            onClick={() => {
                                              setExpandedMemberPhases(prev => ({
                                                ...prev,
                                                [memberId]: {
                                                  ...prev[memberId],
                                                  [phaseGroup.phaseId]: !isExpanded
                                                }
                                              }));
                                            }}
                                            style={{
                                              width: '100%',
                                              padding: '10px 14px',
                                              backgroundColor: isExpanded ? '#34656D' : '#F9FAFB',
                                              color: isExpanded ? 'white' : '#2c3e50',
                                              border: `2px solid ${isExpanded ? '#2a5460' : '#E5E7EB'}`,
                                              borderRadius: '8px',
                                              fontSize: '12px',
                                              fontWeight: '700',
                                              cursor: 'pointer',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'space-between',
                                              transition: 'all 0.2s ease',
                                              marginBottom: isExpanded ? '8px' : 0
                                            }}
                                            onMouseEnter={(e) => {
                                              if (!isExpanded) {
                                                e.target.style.backgroundColor = '#E5E7EB';
                                                e.target.style.borderColor = '#D1D5DB';
                                              }
                                            }}
                                            onMouseLeave={(e) => {
                                              if (!isExpanded) {
                                                e.target.style.backgroundColor = '#F9FAFB';
                                                e.target.style.borderColor = '#E5E7EB';
                                              }
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                              <FaTasks size={12} />
                                              <span>{phaseGroup.phaseTitle} ({phaseGroup.tasks.length})</span>
                                            </div>
                                            <span style={{ fontSize: '14px', fontWeight: '700' }}>
                                              {isExpanded ? '▼' : '▶'}
                                            </span>
                                          </button>
                                          {isExpanded && (
                                            <div style={{
                                              display: 'flex',
                                              flexDirection: 'column',
                                              gap: '12px',
                                              marginTop: '8px'
                                            }}>
                                              {phaseGroup.tasks.map((task, taskIdx) => {
                                                const hasSubmission = task.files && task.files.length > 0;
                                                return renderTaskCard(task, `${phaseGroup.phaseId}-${taskIdx}`, hasSubmission);
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    });
                                  })() : (
                                    <div style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', padding: '12px 8px', textAlign: 'center' }}>
                                      No tasks assigned
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination Arrows - Absolute Positioned */}
                      {groupMembers.length > 3 && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          justifyContent: 'center',
                          position: 'absolute',
                          right: '0',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 10
                        }}>
                          {/* Previous Button */}
                          <button
                            onClick={() => setMemberPage(prev => Math.max(0, prev - 1))}
                            disabled={memberPage === 0}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '8px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: memberPage === 0 ? '#F3F4F6' : 'white',
                              color: memberPage === 0 ? '#D1D5DB' : '#2c3e50',
                              fontSize: '20px',
                              fontWeight: '700',
                              cursor: memberPage === 0 ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (memberPage > 0) {
                                e.target.style.backgroundColor = '#E5E7EB';
                                e.target.style.borderColor = '#9CA3AF';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = memberPage === 0 ? '#F3F4F6' : 'white';
                              e.target.style.borderColor = '#D1D5DB';
                            }}
                          >
                            &lt;
                          </button>

                          {/* Page Indicator */}
                          <div style={{
                            textAlign: 'center',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#6B7280',
                            minWidth: '44px'
                          }}>
                            {memberPage + 1}/{Math.ceil(groupMembers.length / 3)}
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={() => setMemberPage(prev => prev + 1)}
                            disabled={memberPage >= Math.ceil(groupMembers.length / 3) - 1}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '8px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: memberPage >= Math.ceil(groupMembers.length / 3) - 1 ? '#F3F4F6' : 'white',
                              color: memberPage >= Math.ceil(groupMembers.length / 3) - 1 ? '#D1D5DB' : '#2c3e50',
                              fontSize: '20px',
                              fontWeight: '700',
                              cursor: memberPage >= Math.ceil(groupMembers.length / 3) - 1 ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (memberPage < Math.ceil(groupMembers.length / 3) - 1) {
                                e.target.style.backgroundColor = '#E5E7EB';
                                e.target.style.borderColor = '#9CA3AF';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = memberPage >= Math.ceil(groupMembers.length / 3) - 1 ? '#F3F4F6' : 'white';
                              e.target.style.borderColor = '#D1D5DB';
                            }}
                          >
                            &gt;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ========== SECTION 3: EVALUATION SUBMISSIONS ========== */}
                  <div style={{ padding: '24px', borderBottom: '1px solid #E5E7EB' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', marginBottom: '24px', margin: '0 0 24px 0' }}>
                      Project Evaluation Submissions
                    </h3>
                    <div style={{
                      display: 'flex',
                      gap: '24px',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      position: 'relative'
                    }}>
                      {/* Cards Container */}
                      <div style={{
                        display: 'flex',
                        gap: '24px',
                        flexWrap: 'nowrap',
                        flex: 1,
                        overflowX: 'auto',
                        paddingRight: '60px'
                      }}>
                        {groupMembers
                          .slice(evalMemberPage * 3, (evalMemberPage * 3) + 3)
                          .map((member) => {
                          const memberId = member.student_id || member.id;
                          const memberName = member.full_name || member.name || 'Unknown';
                          const memberInitial = memberName.charAt(0).toUpperCase();
                          const memberEvalData = memberEvaluations[memberId] || { hasSubmitted: false, evaluationsReceived: [] };
                          const isLeader = member.role === 'leader';
                          const hasSubmittedEvaluation = memberEvalData.hasSubmitted;
                          const evaluationsReceived = memberEvalData.evaluationsReceived || [];

                          return (
                            <div
                              key={`eval-${memberId}`}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '24px',
                                backgroundColor: 'white',
                                border: '1px solid #e5e7eb',
                                borderRadius: '12px',
                                minWidth: '270px',
                                textAlign: 'center',
                                boxShadow: isLeader ? '0 4px 12px rgba(52, 101, 109, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.3s ease',
                                position: 'relative',
                                flexShrink: 0
                              }}
                            >
                              {/* Evaluation Status Pill - Top Right */}
                              <div style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                padding: '8px 12px',
                                backgroundColor: hasSubmittedEvaluation ? '#D1FAE5' : '#FEF3C7',
                                border: hasSubmittedEvaluation ? '1px solid #6EE7B7' : '1px solid #FCD34D',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '700',
                                color: hasSubmittedEvaluation ? '#047857' : '#B45309'
                              }}>
                                {hasSubmittedEvaluation ? (
                                  <FaCheckCircle size={16} />
                                ) : (
                                  <FaTimes size={16} />
                                )}
                              </div>
                              
                              {/* Profile Picture */}
                              <div style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '8px',
                                backgroundColor: '#34656D',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '40px',
                                fontWeight: '600',
                                overflow: 'hidden',
                                position: 'relative'
                              }}>
                                {member.profile_image_url && member.profile_image_url.trim() ? (
                                  <img
                                    src={getSupabaseImageUrl(member.profile_image_url)}
                                    alt={memberName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                ) : null}
                                {!member.profile_image_url || !member.profile_image_url.trim() ? (
                                  <span>{memberInitial}</span>
                                ) : null}
                              </div>

                              {/* Position */}
                              <div style={{
                                fontSize: '13px',
                                fontWeight: '600',
                                color: '#6b7280',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                {isLeader ? 'Leader' : 'Member'}
                              </div>

                              {/* Name */}
                              <div style={{
                                fontSize: '15px',
                                fontWeight: '700',
                                color: '#2c3e50',
                                wordBreak: 'break-word',
                                maxWidth: '160px',
                                lineHeight: '1.2'
                              }}>
                                {memberName}
                              </div>

                              {/* Evaluations List */}
                              <div style={{
                                width: '100%',
                                borderTop: '1px solid #e5e7eb',
                                paddingTop: '12px',
                                marginTop: '8px'
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#2c3e50',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em',
                                  marginBottom: '10px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px'
                                }}>
                                  <FaTasks size={12} />
                                  Project Evaluation Submission
                                </div>
                                {hasSubmittedEvaluation ? (
                                  <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px',
                                    alignItems: 'center'
                                  }}>
                                    <div style={{
                                      backgroundColor: '#D1FAE5',
                                      border: '1px solid #6EE7B7',
                                      borderRadius: '8px',
                                      padding: '10px 12px',
                                      fontSize: '12px',
                                      color: '#047857',
                                      fontWeight: '600',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      gap: '6px',
                                      width: '100%'
                                    }}>
                                      <FaCheckCircle size={14} />
                                      Submitted
                                    </div>
                                    <button
                                      onClick={() => {
                                        // Fetch the member's evaluation submission to show details
                                        setViewingEvaluationModal({
                                          memberId,
                                          memberName,
                                          submissionDate: memberEvalData.own_evaluation_submission_date
                                        });
                                      }}
                                      style={{
                                        padding: '6px 16px',
                                        fontSize: '11px',
                                        backgroundColor: '#3B82F6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s',
                                        width: '100%'
                                      }}
                                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563EB'}
                                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3B82F6'}
                                    >
                                      View
                                    </button>
                                  </div>
                                ) : (
                                  <div style={{
                                    backgroundColor: '#FEF3C7',
                                    border: '1px solid #FCD34D',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    fontSize: '12px',
                                    color: '#B45309',
                                    fontWeight: '600',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                  }}>
                                    <FaTimes size={14} />
                                    Not Submitted
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Pagination Arrows - Absolute Positioned */}
                      {groupMembers.length > 3 && (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          justifyContent: 'center',
                          position: 'absolute',
                          right: '0',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          zIndex: 10
                        }}>
                          {/* Previous Button */}
                          <button
                            onClick={() => setEvalMemberPage(prev => Math.max(0, prev - 1))}
                            disabled={evalMemberPage === 0}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '8px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: evalMemberPage === 0 ? '#F3F4F6' : 'white',
                              color: evalMemberPage === 0 ? '#D1D5DB' : '#2c3e50',
                              fontSize: '20px',
                              fontWeight: '700',
                              cursor: evalMemberPage === 0 ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (evalMemberPage > 0) {
                                e.target.style.backgroundColor = '#E5E7EB';
                                e.target.style.borderColor = '#9CA3AF';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = evalMemberPage === 0 ? '#F3F4F6' : 'white';
                              e.target.style.borderColor = '#D1D5DB';
                            }}
                          >
                            &lt;
                          </button>

                          {/* Page Indicator */}
                          <div style={{
                            textAlign: 'center',
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#6B7280',
                            minWidth: '44px'
                          }}>
                            {evalMemberPage + 1}/{Math.ceil(groupMembers.length / 3)}
                          </div>

                          {/* Next Button */}
                          <button
                            onClick={() => setEvalMemberPage(prev => prev + 1)}
                            disabled={evalMemberPage >= Math.ceil(groupMembers.length / 3) - 1}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '8px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: evalMemberPage >= Math.ceil(groupMembers.length / 3) - 1 ? '#F3F4F6' : 'white',
                              color: evalMemberPage >= Math.ceil(groupMembers.length / 3) - 1 ? '#D1D5DB' : '#2c3e50',
                              fontSize: '20px',
                              fontWeight: '700',
                              cursor: evalMemberPage >= Math.ceil(groupMembers.length / 3) - 1 ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              if (evalMemberPage < Math.ceil(groupMembers.length / 3) - 1) {
                                e.target.style.backgroundColor = '#E5E7EB';
                                e.target.style.borderColor = '#9CA3AF';
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = evalMemberPage >= Math.ceil(groupMembers.length / 3) - 1 ? '#F3F4F6' : 'white';
                              e.target.style.borderColor = '#D1D5DB';
                            }}
                          >
                            &gt;
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ========== SECTION 4: INCLUSION RECOMMENDATION ========== */}
                  <div style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', marginBottom: '24px', margin: '0 0 24px 0' }}>
                      Inclusion Recommendation
                    </h3>
                    <div style={{
                      display: 'flex',
                      gap: '32px',
                      alignItems: 'flex-start'
                    }}>
                      {/* LEFT COLUMN - INCLUDED MEMBERS */}
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#2c3e50',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <FaCheckCircle size={16} style={{ color: '#10B981' }} />
                          Included
                        </div>
                        {groupMembers.map((member) => {
                          const memberId = member.student_id || member.id;
                          const memberName = member.full_name || member.name || 'Unknown';
                          const memberInitial = memberName.charAt(0).toUpperCase();
                          const inclusion = memberInclusions[memberId];
                          
                          if (!inclusion || !inclusion.included) return null;

                          return (
                            <div
                              key={`included-${memberId}`}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '12px 16px',
                                backgroundColor: '#F0FDF4',
                                border: '1px solid #86EFAC',
                                borderRadius: '8px',
                                transition: 'all 0.3s ease'
                              }}
                            >
                              {/* Avatar */}
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '6px',
                                backgroundColor: '#34656D',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '600',
                                overflow: 'hidden',
                                flexShrink: 0
                              }}>
                                {member.profile_image_url && member.profile_image_url.trim() ? (
                                  <img
                                    src={getSupabaseImageUrl(member.profile_image_url)}
                                    alt={memberName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : null}
                                {!member.profile_image_url || !member.profile_image_url.trim() ? (
                                  <span>{memberInitial}</span>
                                ) : null}
                              </div>

                              {/* Member Info */}
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                flex: 1,
                                minWidth: 0
                              }}>
                                <div style={{
                                  fontSize: '13px',
                                  fontWeight: '700',
                                  color: '#2c3e50',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {memberName}
                                </div>
                                <div style={{
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  color: '#6B7280',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.03em'
                                }}>
                                  {member.role === 'leader' ? 'Leader' : 'Member'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* RIGHT COLUMN - EXCLUDED MEMBERS */}
                      <div style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#2c3e50',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#FEE2E2',
                            border: '2px solid #EF4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#EF4444',
                            fontSize: '14px',
                            fontWeight: 'bold'
                          }}>
                            ✕
                          </div>
                          Excluded
                        </div>
                        {groupMembers.map((member) => {
                          const memberId = member.student_id || member.id;
                          const memberName = member.full_name || member.name || 'Unknown';
                          const memberInitial = memberName.charAt(0).toUpperCase();
                          const inclusion = memberInclusions[memberId];
                          
                          if (!inclusion || inclusion.included) return null;

                          return (
                            <div
                              key={`excluded-${memberId}`}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                padding: '16px',
                                backgroundColor: '#FEF2F2',
                                border: '1px solid #FECACA',
                                borderRadius: '8px'
                              }}
                            >
                              {/* Member Info Row */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px'
                                }}
                              >
                                {/* Avatar */}
                                <div style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '6px',
                                  backgroundColor: '#34656D',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'white',
                                  fontSize: '16px',
                                  fontWeight: '600',
                                  overflow: 'hidden',
                                  flexShrink: 0
                                }}>
                                  {member.profile_image_url && member.profile_image_url.trim() ? (
                                    <img
                                      src={getSupabaseImageUrl(member.profile_image_url)}
                                      alt={memberName}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                      onError={(e) => { e.target.style.display = 'none'; }}
                                    />
                                  ) : null}
                                  {!member.profile_image_url || !member.profile_image_url.trim() ? (
                                    <span>{memberInitial}</span>
                                  ) : null}
                                </div>

                                {/* Member Info */}
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '2px',
                                  flex: 1,
                                  minWidth: 0
                                }}>
                                  <div style={{
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    color: '#2c3e50',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}>
                                    {memberName}
                                  </div>
                                  <div style={{
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    color: '#6B7280',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.03em'
                                  }}>
                                    {member.role === 'leader' ? 'Leader' : 'Member'}
                                  </div>
                                </div>

                                {/* View Reason Button */}
                                <button
                                  onClick={() => setExpandedReasonFields(prev => ({
                                    ...prev,
                                    [memberId]: !prev[memberId]
                                  }))}
                                  style={{
                                    padding: '6px 12px',
                                    backgroundColor: expandedReasonFields[memberId] ? '#FCD34D' : '#FEF3C7',
                                    border: '1px solid #FCA5A5',
                                    borderRadius: '6px',
                                    color: '#B45309',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.backgroundColor = '#FCD34D';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.backgroundColor = expandedReasonFields[memberId] ? '#FCD34D' : '#FEF3C7';
                                  }}
                                >
                                  {expandedReasonFields[memberId] ? '▼ Hide' : '▶ View Reason'}
                                </button>
                              </div>

                              {/* Exclusion Reason - Textarea (Shown/Hidden by View Reason button) */}
                              {expandedReasonFields[memberId] && (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                  animation: 'slideDown 0.2s ease',
                                  padding: '12px',
                                  backgroundColor: '#FFFBEB',
                                  border: '1px solid #FCD34D',
                                  borderRadius: '6px'
                                }}>
                                  <label style={{
                                    fontSize: '12px',
                                    fontWeight: '700',
                                    color: '#2c3e50',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                  }}>
                                    Leader's Reason for Exclusion:
                                  </label>
                                  <textarea
                                    value={inclusion.reason || ''}
                                    readOnly={true}
                                    placeholder="No reason provided"
                                    className="exclusion-reason-textarea"
                                    style={{
                                      padding: '10px 12px',
                                      backgroundColor: '#FFFFFF',
                                      border: '1px solid #D1D5DB',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      color: '#1F2937',
                                      resize: 'vertical',
                                      minHeight: '80px',
                                      fontFamily: 'inherit',
                                      transition: 'all 0.2s ease',
                                      cursor: 'not-allowed'
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* ========== SECTION 5: GRADING ========== */}
                  <div style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', marginBottom: '24px', margin: '0 0 24px 0' }}>
                      Grading - Individual
                    </h3>
                    {(() => {
                      // Check if phase uses builtin evaluation
                      const phaseSnapshot = selectedSubmissionData?.phaseSnapshot;
                      const isBuiltinEvaluation = phaseSnapshot?.evaluation_form_type === 'builtin';
                      const isCustomEvaluation = phaseSnapshot?.evaluation_form_type === 'custom';
                      
                      // Determine grid columns based on evaluation type
                      const gridColumns = isCustomEvaluation 
                        ? '200px 120px 160px'  // Profile, Inclusion, Grade (no Evaluation column)
                        : '200px 120px 140px 160px';  // Profile, Inclusion, Evaluation, Grade
                      
                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}>
                          {/* Column Headers */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: gridColumns,
                            gap: '12px',
                            padding: '12px',
                            backgroundColor: '#34656D',
                            borderRadius: '8px 8px 0 0',
                            fontWeight: '700',
                            fontSize: '11px',
                            color: 'white',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                          }}>
                            <div>Profile</div>
                            <div style={{ textAlign: 'center' }}>Inclusion</div>
                            {!isCustomEvaluation && <div style={{ textAlign: 'center' }}>Evaluation Grade</div>}
                            <div style={{ textAlign: 'center' }}>Individual Grade</div>
                          </div>

                          {/* Data Rows */}
                          {groupMembers.map((member) => {
                            const memberId = member.student_id || member.id;
                            const memberName = member.full_name || member.name || 'Unknown';
                            const memberInitial = memberName.charAt(0).toUpperCase();
                            const inclusion = memberInclusions[memberId];
                            
                            // Get member's evaluation data from selectedSubmissionData
                            const evaluationSubmissionsArray = selectedSubmissionData?.evaluationSubmissions || [];
                            const memberEvalData = evaluationSubmissionsArray.find(evalSub => evalSub.member_id === memberId);
                            
                            // Calculate average evaluation score from evaluations_received
                            let avgEvalScore = 0;
                            let totalScore = 0;
                            let evalCount = 0;
                            
                            if (memberEvalData && memberEvalData.evaluations_received && memberEvalData.evaluations_received.length > 0) {
                              memberEvalData.evaluations_received.forEach(evaluation => {
                                if (evaluation.total_score && evaluation.evaluation_form && evaluation.evaluation_form.total_points) {
                                  // Calculate percentage for this evaluation
                                  const percentage = (evaluation.total_score / evaluation.evaluation_form.total_points) * 100;
                                  totalScore += percentage;
                                  evalCount++;
                                }
                              });
                              
                              if (evalCount > 0) {
                                avgEvalScore = Math.round(totalScore / evalCount);
                              }
                            }
                            
                            const grades = memberGrades[memberId] || { individualGrade: 0, groupGrade: 0 };

                            return (
                              <div key={`grade-row-${memberId}`} style={{
                                display: 'grid',
                                gridTemplateColumns: gridColumns,
                                gap: '12px',
                                padding: '12px',
                                backgroundColor: 'white',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                alignItems: 'center'
                              }}>
                            {/* Column 1: Profile - Name & Position Pill */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px'
                            }}>
                              <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '6px',
                                backgroundColor: '#34656D',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '16px',
                                fontWeight: '600',
                                overflow: 'hidden',
                                flexShrink: 0
                              }}>
                                {member.profile_image_url && member.profile_image_url.trim() ? (
                                  <img
                                    src={getSupabaseImageUrl(member.profile_image_url)}
                                    alt={memberName}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                ) : null}
                                {!member.profile_image_url || !member.profile_image_url.trim() ? (
                                  <span>{memberInitial}</span>
                                ) : null}
                              </div>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                minWidth: 0
                              }}>
                                <div style={{
                                  fontSize: '12px',
                                  fontWeight: '700',
                                  color: '#2c3e50',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {memberName}
                                </div>
                                <div style={{
                                  fontSize: '10px',
                                  fontWeight: '600',
                                  color: '#6B7280',
                                  textTransform: 'uppercase'
                                }}>
                                  {member.role === 'leader' ? 'Leader' : 'Member'}
                                </div>
                              </div>
                            </div>

                              {/* Column 2: Inclusion Status */}
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                <div style={{
                                  padding: '6px 10px',
                                  backgroundColor: inclusion?.included ? '#D1FAE5' : '#FEE2E2',
                                  border: inclusion?.included ? '1px solid #6EE7B7' : '1px solid #FECACA',
                                  borderRadius: '6px',
                                  fontSize: '10px',
                                  fontWeight: '700',
                                  color: inclusion?.included ? '#047857' : '#DC2626',
                                  textAlign: 'center'
                                }}>
                                  {inclusion?.included ? '✓ Included' : '✕ Excluded'}
                                </div>
                              </div>

                              {/* Column 3: Evaluation Score (only for builtin) */}
                              {!isCustomEvaluation && (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <div style={{
                                    padding: '6px 12px',
                                    backgroundColor: avgEvalScore > 0 ? '#F3E8FF' : '#F3F4F6',
                                    border: avgEvalScore > 0 ? '1px solid #E9D5FF' : '1px solid #E5E7EB',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    color: avgEvalScore > 0 ? '#6B21A8' : '#9CA3AF',
                                    textAlign: 'center'
                                  }}>
                                    {memberEvalData && memberEvalData.evaluations_received && memberEvalData.evaluations_received.length > 0
                                      ? (() => {
                                          let totalPoints = 0;
                                          let totalScore = 0;
                                          memberEvalData.evaluations_received.forEach(evaluation => {
                                            if (evaluation.evaluation_form && evaluation.evaluation_form.total_points) {
                                              totalPoints = evaluation.evaluation_form.total_points;
                                              totalScore += evaluation.total_score || 0;
                                            }
                                          });
                                          return totalPoints > 0 ? `${totalScore}/${totalPoints}` : 'N/A';
                                        })()
                                      : 'N/A'
                                    }
                                  </div>
                                </div>
                              )}
                              
                              {/* Column 4 (or 3 if custom): Individual Grade - Simple Toggle */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              justifyContent: 'center'
                            }}>
                              {/* Toggle Switch */}
                              <button
                                onClick={() => {
                                  // Don't allow toggle if already graded
                                  if (gradeSubmissionsView.selectedSubmission?.grade === null || gradeSubmissionsView.selectedSubmission?.grade === undefined) {
                                    setExpandedReasonFields(prev => ({
                                      ...prev,
                                      [`grade-${memberId}`]: !prev[`grade-${memberId}`]
                                    }));
                                  }
                                }}
                                disabled={gradeSubmissionsView.selectedSubmission?.grade !== null && gradeSubmissionsView.selectedSubmission?.grade !== undefined}
                                title={
                                  (gradeSubmissionsView.selectedSubmission?.grade !== null && gradeSubmissionsView.selectedSubmission?.grade !== undefined)
                                    ? 'Cannot edit - submission already graded'
                                    : (expandedReasonFields[`grade-${memberId}`] ? 'Click to use group grade' : 'Click to set custom grade')
                                }
                                style={{
                                  width: '44px',
                                  height: '24px',
                                  backgroundColor: expandedReasonFields[`grade-${memberId}`] ? '#10B981' : '#E5E7EB',
                                  border: 'none',
                                  borderRadius: '12px',
                                  cursor: (gradeSubmissionsView.selectedSubmission?.grade !== null && gradeSubmissionsView.selectedSubmission?.grade !== undefined) ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.3s ease',
                                  position: 'relative',
                                  padding: 0,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: expandedReasonFields[`grade-${memberId}`] ? 'flex-end' : 'flex-start',
                                  opacity: (gradeSubmissionsView.selectedSubmission?.grade !== null && gradeSubmissionsView.selectedSubmission?.grade !== undefined) ? 0.6 : 1
                                }}
                              >
                                <div style={{
                                  width: '20px',
                                  height: '20px',
                                  backgroundColor: 'white',
                                  borderRadius: '10px',
                                  margin: '2px',
                                  transition: 'all 0.3s ease'
                                }} />
                              </button>

                              {/* Display Value/Input */}
                              {!expandedReasonFields[`grade-${memberId}`] ? (
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}>
                                  <div style={{
                                    fontSize: '12px',
                                    fontWeight: '800',
                                    color: '#34656D'
                                  }}>
                                    {groupGrade}
                                  </div>
                                  <div style={{
                                    fontSize: '9px',
                                    fontWeight: '600',
                                    color: '#9CA3AF',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                  }}>
                                    Same as Group
                                  </div>
                                </div>
                              ) : (
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    placeholder="0"
                                    defaultValue={member.individual_grade !== undefined && member.individual_grade !== null ? member.individual_grade : groupGrade}
                                    data-member-id={memberId}
                                    readOnly={gradeSubmissionsView.selectedSubmission?.grade !== null && gradeSubmissionsView.selectedSubmission?.grade !== undefined}
                                    style={{
                                      width: '70px',
                                      padding: '6px 8px',
                                      backgroundColor: 'white',
                                      border: '2px solid #34656D',
                                      borderRadius: '6px',
                                      fontSize: '12px',
                                      fontWeight: '800',
                                      color: '#34656D',
                                      textAlign: 'center',
                                      cursor: (gradeSubmissionsView.selectedSubmission?.grade !== null && gradeSubmissionsView.selectedSubmission?.grade !== undefined) ? 'not-allowed' : 'text'
                                    }}
                                  />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  </div>

                  {/* ========== SECTION 6: GRADING - GROUP ========== */}
                  <div style={{ padding: '24px' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: '#2c3e50', marginBottom: '24px', margin: '0 0 24px 0' }}>
                      Grading - Group
                    </h3>
                    
                    {/* Top Row: Files, Grade & Feedback */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1.5fr 1fr 1.2fr',
                      gap: '24px',
                      marginBottom: '24px'
                    }}>
                      {/* LEFT: Submitted Files */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                      }}>
                        {/* Header with Label */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          paddingBottom: '8px',
                          borderBottom: '2px solid #E5E7EB'
                        }}>
                          <FaFileAlt style={{ color: '#34656D', fontSize: '16px' }} />
                          <label style={{
                            fontSize: '13px',
                            fontWeight: '800',
                            color: '#2c3e50',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            margin: 0
                          }}>
                            Submitted Files
                          </label>
                        </div>

                        {/* Files Container */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          flex: 1
                        }}>
                          {getFileUrlsArray(gradeSubmissionsView.selectedSubmission?.fileUrls).length > 0 ? (
                            getFileUrlsArray(gradeSubmissionsView.selectedSubmission?.fileUrls).map((file, idx) => {
                              const fileUrl = typeof file === 'object' ? file.url : file;
                              const fileName = typeof file === 'object' && file.name ? file.name : (typeof fileUrl === 'string' ? fileUrl.split('/').pop() : `File ${idx + 1}`);
                              
                              return (
                                <div key={`file-${idx}`} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '12px 14px',
                                  backgroundColor: '#FAFBFC',
                                  border: '1px solid #E5E7EB',
                                  borderRadius: '8px',
                                  transition: 'all 0.2s ease',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => { 
                                  e.currentTarget.style.backgroundColor = '#F0F9FF';
                                  e.currentTarget.style.borderColor = '#0369A1';
                                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(3, 105, 161, 0.1)';
                                }}
                                onMouseLeave={(e) => { 
                                  e.currentTarget.style.backgroundColor = '#FAFBFC';
                                  e.currentTarget.style.borderColor = '#E5E7EB';
                                  e.currentTarget.style.boxShadow = 'none';
                                }}>
                                  <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    flex: 1,
                                    minWidth: 0
                                  }}>
                                    <FaDownload style={{ fontSize: '14px', color: '#10B981', flexShrink: 0 }} />
                                    <span style={{
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: '#2c3e50',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {fileName}
                                    </span>
                                  </div>
                                  <button onClick={() => downloadSubmissionFile(fileUrl, fileName)} style={{
                                    padding: '4px 8px',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    color: '#0369A1',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                  }}
                                  onMouseEnter={(e) => { 
                                    e.target.style.backgroundColor = '#E0F2FE';
                                    e.target.style.borderRadius = '4px';
                                  }}
                                  onMouseLeave={(e) => { 
                                    e.target.style.backgroundColor = 'transparent';
                                  }}>
                                    <FaDownload style={{ fontSize: '11px' }} />
                                    Download
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <div style={{
                              padding: '16px',
                              backgroundColor: '#F9FAFB',
                              border: '1px solid #E5E7EB',
                              borderRadius: '8px',
                              textAlign: 'center',
                              color: '#9CA3AF',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}>
                              No files submitted
                            </div>
                          )}
                        </div>

                        {/* Buttons Row - View Rubric & Reports */}
                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          alignItems: 'center'
                        }}>
                          {/* View Rubric Button */}
                          <button 
                            onClick={() => {
                              // Get the rubric data from the submission
                              const submission = gradeSubmissionsView.selectedSubmission;
                              console.log('🔍 View Rubric clicked - Full submission:', submission);
                              console.log('🔍 Submission type:', submission?.type);
                              console.log('🔍 RubricData:', submission?.rubricData);
                              console.log('🔍 PhaseSnapshot:', submission?.phaseSnapshot);
                              
                              if (submission) {
                                // Check if we have the new rubricData structure
                                if (submission.rubricData) {
                                  console.log('✅ Found rubricData, opening modal with:', submission.rubricData);
                                  setRubricContent(submission.rubricData);
                                  setShowRubricModal(true);
                                } else if (submission.phaseSnapshot) {
                                  // Fallback to old structure for backward compatibility
                                  const rubric = submission.phaseSnapshot.rubric || submission.phaseSnapshot.rubric_file_url || null;
                                  console.log('📦 Checking phaseSnapshot for rubric:', rubric);
                                  if (rubric) {
                                    setRubricContent(rubric);
                                    setShowRubricModal(true);
                                  } else {
                                    console.warn('❌ No rubric found in phaseSnapshot');
                                    alert('No rubric available for this phase');
                                  }
                                } else {
                                  console.warn('❌ No rubricData or phaseSnapshot found');
                                  alert('No rubric available for this phase');
                                }
                              } else {
                                alert('Please select a phase submission first');
                              }
                            }}
                            style={{
                            padding: '12px 16px',
                            backgroundColor: '#0369A1',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            flex: 1
                          }}
                          onMouseEnter={(e) => { 
                            e.target.style.backgroundColor = '#0266CC';
                            e.target.style.boxShadow = '0 4px 12px rgba(3, 105, 161, 0.3)';
                          }}
                          onMouseLeave={(e) => { 
                            e.target.style.backgroundColor = '#0369A1';
                            e.target.style.boxShadow = 'none';
                          }}>
                            <FaEye style={{ fontSize: '13px' }} />
                            {gradeSubmissionsView.selectedSubmission?.type === 'phase' ? 'Phase Rubric' : 'Project Rubric'}
                          </button>

                          {/* View Evaluation Form Button */}
                          <button 
                            onClick={async () => {
                              const submission = gradeSubmissionsView.selectedSubmission;
                              console.log('� View Reports clicked - Full submission:', submission);
                              
                              if (submission) {
                                // Extract group name (direct field)
                                const groupName = submission.groupName || 'Unknown Group';
                                
                                // Fetch full member details with emails from the group
                                let groupMembers = [];
                                if (submission.groupId) {
                                  try {
                                    const token = localStorage.getItem('token');
                                    const response = await fetch(
                                      `${apiConfig.baseURL}/api/professor/course/${courseId}/groups/${submission.groupId}/members`,
                                      {
                                        headers: {
                                          'Authorization': `Bearer ${token}`,
                                          'Content-Type': 'application/json'
                                        }
                                      }
                                    );
                                    
                                    if (response.ok) {
                                      const membersData = await response.json();
                                      console.log('✅ Fetched group members for modal:', membersData);
                                      // Map the response to ensure consistent structure with email field
                                      groupMembers = (Array.isArray(membersData) ? membersData : membersData.members || membersData.data || []).map(member => ({
                                        id: member.id || member.user_id || member.student_id,
                                        student_id: member.student_id || member.id || member.user_id,
                                        first_name: member.first_name || member.firstName || (member.name ? member.name.split(' ')[0] : 'N/A'),
                                        last_name: member.last_name || member.lastName || (member.name ? member.name.split(' ').slice(1).join(' ') : ''),
                                        full_name: member.full_name || member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim(),
                                        email: member.email || member.student_email || member.user_email || 'N/A',
                                        role: member.role || 'Member',
                                        profile_image_url: member.profile_image_url || member.profileImage || null
                                      }));
                                    } else {
                                      console.error('Failed to fetch group members:', response.status);
                                    }
                                  } catch (error) {
                                    console.error('Error fetching group members:', error);
                                  }
                                }
                                
                                // Fallback to memberTasks if API fetch failed
                                if (groupMembers.length === 0 && submission.memberTasks) {
                                  console.log('⚠️ Using fallback memberTasks for group members');
                                  groupMembers = (submission.memberTasks || []).map(memberTask => {
                                    // Try to find the student email from the students list
                                    const studentRecord = students.find(s => s.id === memberTask.member_id || s.student_id === memberTask.member_id);
                                    const email = studentRecord?.email || studentRecord?.student_email || 'N/A';
                                    
                                    return {
                                      id: memberTask.member_id,
                                      student_id: memberTask.member_id,
                                      first_name: (memberTask.member_name || '').split(' ')[0] || 'N/A',
                                      last_name: (memberTask.member_name || '').split(' ').slice(1).join(' ') || '',
                                      full_name: memberTask.member_name || 'N/A',
                                      email: email,
                                      role: memberTask.role || 'Member',
                                      profile_image_url: memberProfileImages[memberTask.member_id] || null
                                    };
                                  });
                                }
                                
                                // Extract project title from projectSnapshot or phaseSnapshot
                                let projectTitle = 'Unknown Project';
                                if (submission.projectSnapshot?.title) {
                                  projectTitle = submission.projectSnapshot.title;
                                } else if (submission.phaseSnapshot?.projectTitle) {
                                  projectTitle = submission.phaseSnapshot.projectTitle;
                                }
                                
                                // Extract phase name (direct fields or from snapshot)
                                const phaseName = submission.phaseName 
                                  || submission.phaseTitle 
                                  || submission.phaseSnapshot?.name
                                  || submission.phaseSnapshot?.title
                                  || 'N/A';
                                
                                console.log('📊 Reports Modal Data:', {
                                  groupName,
                                  groupMembers,
                                  projectTitle,
                                  phaseName,
                                  submissionType: submission.type || submission.submissionType
                                });
                                
                                // Set up the reports modal with extracted data
                                setReportsModalProject({ title: projectTitle });
                                setReportsModalPhase({ name: phaseName });
                                setReportsModalGroupData({
                                  id: submission.groupId,
                                  name: groupName,
                                  members: groupMembers
                                });
                                setShowReportsModal(true);
                              } else {
                                alert('Please select a group submission first');
                              }
                            }}
                            style={{
                            padding: '12px 16px',
                            backgroundColor: '#7C3AED',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            flex: 1
                          }}
                          onMouseEnter={(e) => { 
                            e.target.style.backgroundColor = '#6D28D9';
                            e.target.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.3)';
                          }}
                          onMouseLeave={(e) => { 
                            e.target.style.backgroundColor = '#7C3AED';
                            e.target.style.boxShadow = 'none';
                          }}>
                            <FaChartBar style={{ fontSize: '13px' }} />
                            Reports
                          </button>
                        </div>
                      </div>

                      {/* MIDDLE: Group Grade */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <FaChartBar style={{ color: '#34656D', fontSize: '14px' }} />
                          <label style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            color: '#2c3e50',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            margin: 0
                          }}>
                            Group Grade
                          </label>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%',
                          height: '110px',
                          padding: '0',
                          backgroundColor: 'white',
                          border: '3px solid #34656D',
                          borderRadius: '8px'
                        }}>
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0px'
                          }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              value={groupGrade}
                              onChange={(e) => setGroupGrade(Number(e.target.value) || 0)}
                              readOnly={gradeSubmissionsView.selectedSubmission?.grade !== null && gradeSubmissionsView.selectedSubmission?.grade !== undefined}
                              style={{
                                width: 'auto',
                                padding: '0',
                                backgroundColor: 'transparent',
                                border: 'none',
                                fontSize: '40px',
                                fontWeight: '900',
                                color: '#34656D',
                                textAlign: 'center',
                                outline: 'none',
                                maxWidth: '80px',
                                cursor: (gradeSubmissionsView.selectedSubmission?.grade !== null && gradeSubmissionsView.selectedSubmission?.grade !== undefined) ? 'not-allowed' : 'text'
                              }}
                            />
                            <span style={{
                              fontSize: '12px',
                              fontWeight: '700',
                              color: '#34656D',
                              marginTop: '2px'
                            }}>
                              / 100
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT: Group Feedback */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <FaComments style={{ color: '#34656D', fontSize: '14px' }} />
                          <label style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            color: '#2c3e50',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            margin: 0
                          }}>
                            Feedback
                          </label>
                        </div>
                        {(() => {
                          const isGroupFeedbackDisabled = gradeSubmissionsView.selectedSubmission?.grade !== null && gradeSubmissionsView.selectedSubmission?.grade !== undefined;

                          const feedbackStyle = isGroupFeedbackDisabled ? {
                            padding: '12px 16px',
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #D1D5DB',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#111827',
                            resize: 'vertical',
                            height: '110px',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s ease',
                            cursor: 'not-allowed'
                          } : {
                            padding: '12px 16px',
                            backgroundColor: 'white',
                            border: '2px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '12px',
                            color: '#4B5563',
                            resize: 'vertical',
                            height: '110px',
                            fontFamily: 'inherit',
                            transition: 'all 0.2s ease',
                            cursor: 'text'
                          };

                          return (
                            <textarea
                              placeholder="Enter group feedback..."
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              readOnly={isGroupFeedbackDisabled}
                              className={isGroupFeedbackDisabled ? "exclusion-reason-textarea" : ""}
                              style={feedbackStyle}
                              onFocus={(e) => {
                                if (!isGroupFeedbackDisabled) {
                                  e.target.style.borderColor = '#34656D';
                                  e.target.style.boxShadow = '0 0 0 3px rgba(52, 101, 109, 0.1)';
                                }
                              }}
                              onBlur={(e) => {
                                e.target.style.borderColor = isGroupFeedbackDisabled ? '#D1D5DB' : '#E5E7EB';
                                e.target.style.boxShadow = 'none';
                              }}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    {/* Assign Grade Button - Bottom Right */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '24px',
                      paddingTop: '24px',
                      borderTop: '1px solid #E5E7EB'
                    }}>
                      {(() => {
                        // Check if ANY attempt in the submission group is graded
                        const submission = gradeSubmissionsView.selectedSubmission;
                        const allSubmissionsData = gradeSubmissionsView.detailsData || [];
                        
                        // Find all versions of this submission (original + resubmissions)
                        const groupKey = submission?.is_resubmission && submission?.original_submission_id 
                          ? submission?.original_submission_id 
                          : submission?.id;
                        
                        const allVersionsInGroup = allSubmissionsData.filter(sub => {
                          const key = sub.is_resubmission && sub.original_submission_id 
                            ? sub.original_submission_id 
                            : sub.id;
                          return key === groupKey;
                        });
                        
                        // Check if ANY version is graded
                        const anyAttemptGraded = allVersionsInGroup.some(sub => sub.grade !== null && sub.grade !== undefined);
                        
                        return (
                          <button
                            onClick={async () => {
                              // Handler for Assign Grade button
                              console.log('💾 Assign Grade clicked');
                              
                              const submission = gradeSubmissionsView.selectedSubmission;
                              if (!submission) {
                                alert('No submission selected');
                                return;
                              }
                              
                              // Validate group grade
                              if (groupGrade === null || groupGrade === undefined || groupGrade === '') {
                                alert('Please enter a group grade');
                                return;
                              }
                              
                              // Collect individual member grades
                              const memberGrades = {};
                              const members = submission.memberInclusions || [];
                              
                              members.forEach(member => {
                                const memberId = member.member_id;
                                const hasCustomGrade = expandedReasonFields[`grade-${memberId}`];
                                
                                if (hasCustomGrade) {
                                  // Get custom grade from input field
                                  const inputElement = document.querySelector(`input[data-member-id="${memberId}"]`);
                                  const customGrade = inputElement ? parseFloat(inputElement.value) : null;
                                  
                                  if (customGrade !== null && !isNaN(customGrade)) {
                                    memberGrades[memberId] = {
                                      grade: customGrade,
                                      feedback: null
                                    };
                                  }
                                } else {
                                  // Use group grade (same as group)
                                  memberGrades[memberId] = {
                                    grade: parseFloat(groupGrade),
                                    feedback: null
                                  };
                                }
                              });
                              
                              console.log('📊 Submitting grades:', {
                                submissionId: submission.id,
                                submissionType: submission.type,
                                groupGrade,
                                feedback,
                                memberGrades
                              });
                              
                              try {
                                const token = localStorage.getItem('token');
                                const endpoint = submission.type === 'phase'
                                  ? `${apiConfig.baseURL}/api/grade-submissions/phase-submissions/${submission.id}/grade`
                                  : `${apiConfig.baseURL}/api/grade-submissions/project-submissions/${submission.id}/grade`;
                                
                                const response = await fetch(endpoint, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                  },
                                  body: JSON.stringify({
                                    grade: parseFloat(groupGrade),
                                    feedback: feedback || null,
                                    memberGrades: Object.keys(memberGrades).length > 0 ? memberGrades : null
                                  })
                                });
                                
                                if (!response.ok) {
                                  const error = await response.json();
                                  throw new Error(error.error || 'Failed to save grade');
                                }
                                
                                const result = await response.json();
                                console.log('✅ Grade saved successfully:', result);
                                
                                alert('Grade assigned successfully!');
                                
                                // Refresh submissions
                                if (gradeSubmissionsView.selectedProject) {
                                  handleProjectSelect(gradeSubmissionsView.selectedProject);
                                }
                              } catch (error) {
                                console.error('❌ Error saving grade:', error);
                                alert(`Failed to save grade: ${error.message}`);
                              }
                            }}
                            disabled={anyAttemptGraded}
                            style={{
                              padding: '12px 24px',
                              backgroundColor: anyAttemptGraded ? '#9CA3AF' : '#34656D',
                              border: 'none',
                              borderRadius: '8px',
                              color: 'white',
                              fontSize: '13px',
                              fontWeight: '700',
                              cursor: anyAttemptGraded ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              opacity: anyAttemptGraded ? 0.6 : 1
                            }}
                            onMouseEnter={(e) => {
                              if (!anyAttemptGraded) {
                                e.target.style.backgroundColor = '#2a5460';
                                e.target.style.boxShadow = '0 4px 12px rgba(52, 101, 109, 0.3)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!anyAttemptGraded) {
                                e.target.style.backgroundColor = '#34656D';
                                e.target.style.boxShadow = 'none';
                              }
                            }}
                          >
                            <FaCheckCircle style={{ fontSize: '14px' }} />
                            {anyAttemptGraded ? 'Already Graded' : 'Assign Grade'}
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'rgba(255, 255, 255, 0.9)',
                  textAlign: 'center'
                }}>
                  <FaClipboardList style={{ fontSize: '64px', marginBottom: '16px', color: 'rgba(255, 255, 255, 0.7)' }} />
                  <p style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: 'rgba(255, 255, 255, 0.95)' }}>
                    Select a submission to view details
                  </p>
                  <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginTop: '8px' }}>
                    Click on any submission from the list to see its details and files
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        

      </div>
    );
  }

  function renderGradeSheet() {
    return (
      <div style={{ padding: '2rem', width: '100%', margin: '0 auto' }}>
        {/* Header Card */}
        <div style={{
          position: 'relative',
          background: 'rgba(9, 18, 44, 0.15)',
          border: '0.1px solid rgb(95, 95, 95)',
          borderRadius: '0px',
          boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
          backdropFilter: 'blur(3.2px) saturate(120%)',
          overflow: 'hidden',
          marginBottom: '1.5rem'
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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1.5rem 2rem',
            borderBottom: '2px solid rgb(135, 35, 65)',
            backgroundColor: 'rgb(255, 255, 255)'
          }}>
            <div>
              <h3 style={{
                color: 'rgb(135, 35, 65)',
                fontWeight: '700',
                margin: '0 0 0.5rem 0',
                fontSize: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <FaClipboardList size={24} />
                Grade Sheet
              </h3>
              <p style={{ 
                fontSize: '0.875rem', 
                color: 'rgb(100, 100, 100)', 
                margin: 0,
                fontWeight: '500'
              }}>
                {gradeSheetData.students.length} students, {gradeSheetData.projects.length} projects
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={exportGradeSheet}
                disabled={gradeSheetData.students.length === 0}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: gradeSheetData.students.length === 0 ? 'rgb(200, 200, 200)' : 'rgb(46, 204, 113)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: gradeSheetData.students.length === 0 ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: gradeSheetData.students.length === 0 ? 'none' : '0 2px 8px rgba(46, 204, 113, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  opacity: gradeSheetData.students.length === 0 ? 0.6 : 1
                }}
                onMouseEnter={(e) => {
                  if (gradeSheetData.students.length > 0) {
                    e.target.style.background = 'rgb(39, 174, 96)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (gradeSheetData.students.length > 0) {
                    e.target.style.background = 'rgb(46, 204, 113)';
                  }
                }}
              >
                <FaDownload size={14} />
                Export to Excel
              </button>
              <button
                onClick={fetchGradeSheetData}
                style={{
                  padding: '0.6rem 1.5rem',
                  borderRadius: '6px',
                  border: 'none',
                  background: 'rgb(135, 35, 65)',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(135, 35, 65, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgb(110, 25, 50)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgb(135, 35, 65)';
                }}
              >
                <FaSync size={14} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {gradeSheetData.loading && (
          <div style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden'
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
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '4rem',
              backgroundColor: 'rgb(255, 255, 255)'
            }}>
              <div style={{ textAlign: 'center' }}>
                <FaSpinner style={{ 
                  fontSize: '3rem', 
                  color: 'rgb(135, 35, 65)', 
                  animation: 'spin 1s linear infinite' 
                }} />
                <p style={{ 
                  marginTop: '1rem', 
                  color: 'rgb(100, 100, 100)',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>Loading grade sheet...</p>
              </div>
            </div>
          </div>
        )}

        {/* Grade Sheet Table */}
        {!gradeSheetData.loading && gradeSheetData.students.length > 0 && (
          <div style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden'
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
              backgroundColor: 'rgb(255, 255, 255)',
              overflowX: 'auto',
              overflowY: 'auto',
              maxHeight: 'calc(100vh - 250px)',
              width: '100%'
            }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'rgb(135, 35, 65)' }}>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '13px',
                    borderRight: '1px solid rgb(110, 25, 50)',
                    minWidth: '120px'
                  }}>
                    Student Number
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '13px',
                    borderRight: '1px solid rgb(110, 25, 50)',
                    minWidth: '200px',
                    maxWidth: '300px'
                  }}>
                    Name
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '13px',
                    borderRight: '1px solid rgb(110, 25, 50)',
                    minWidth: '130px'
                  }}>
                    Group
                  </th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '13px',
                    borderRight: '2px solid rgb(110, 25, 50)',
                    minWidth: '100px'
                  }}>
                    Position
                  </th>
                  
                  {/* Dynamic grade columns */}
                  {gradeSheetData.projects.map((project, projectIndex) => (
                    <React.Fragment key={project.id}>
                      {/* PROJECT SUBMISSION - TWO COLUMNS (Group Grade + Individual Grade) */}
                      {project.hasFinalSubmission && (
                        <>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '11px',
                            minWidth: '110px',
                            backgroundColor: 'rgb(110, 25, 50)',
                            borderRight: '1px solid rgb(90, 20, 40)',
                            whiteSpace: 'normal',
                            lineHeight: '1.3'
                          }}>
                            (P-{projectIndex + 1}) {project.title}<br/>GRP Grade
                          </th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '11px',
                            minWidth: '110px',
                            backgroundColor: 'rgb(90, 20, 40)',
                            borderRight: '1px solid rgb(90, 20, 40)',
                            whiteSpace: 'normal',
                            lineHeight: '1.3'
                          }}>
                            (P-{projectIndex + 1}) {project.title}<br/>IND Grade
                          </th>
                        </>
                      )}
                      {/* THEN PHASES - TWO COLUMNS EACH (Group Grade + Individual Grade) */}
                      {Object.values(project.phases).sort((a, b) => a.number - b.number).map(phase => (
                        <React.Fragment key={phase.id}>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '10px',
                            minWidth: '120px',
                            borderRight: '1px solid rgb(110, 25, 50)',
                            whiteSpace: 'normal',
                            lineHeight: '1.2'
                          }}>
                            (P-{projectIndex + 1} Ph.{phase.number}) {phase.name || `Phase ${phase.number}`}<br/>GRP Grade
                          </th>
                          <th style={{
                            padding: '12px 16px',
                            textAlign: 'center',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '10px',
                            minWidth: '120px',
                            borderRight: '1px solid rgb(110, 25, 50)',
                            whiteSpace: 'normal',
                            lineHeight: '1.2',
                            backgroundColor: 'rgb(110, 25, 50)'
                          }}>
                            (P-{projectIndex + 1} Ph.{phase.number}) {phase.name || `Phase ${phase.number}`}<br/>IND Grade
                          </th>
                        </React.Fragment>
                      ))}
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gradeSheetData.students.map((student, idx) => (
                  <tr key={student.id} style={{
                    backgroundColor: idx % 2 === 0 ? 'rgb(255, 255, 255)' : 'rgb(249, 250, 251)',
                    borderBottom: '1px solid rgb(229, 231, 235)'
                  }}>
                    {/* Student Number */}
                    <td style={{
                      padding: '12px 16px',
                      fontWeight: '600',
                      color: 'rgb(44, 62, 80)',
                      fontSize: '14px',
                      borderRight: '1px solid rgb(229, 231, 235)'
                    }}>
                      {student.studentNumber || 'N/A'}
                    </td>
                    
                    {/* Name */}
                    <td style={{
                      padding: '12px 16px',
                      borderRight: '1px solid rgb(229, 231, 235)',
                      maxWidth: '300px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {student.profileImage && (
                          <img
                            src={getSupabaseImageUrl(student.profileImage)}
                            alt={student.fullName}
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid rgb(229, 231, 235)',
                              flexShrink: 0
                            }}
                            onError={(e) => { 
                              e.target.style.display = 'none'; 
                            }}
                          />
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontWeight: '600', color: 'rgb(44, 62, 80)', fontSize: '13px', wordBreak: 'break-word' }}>
                            {student.fullName || 'Unknown Student'}
                          </div>
                          <div style={{ 
                            fontSize: '11px', 
                            color: 'rgb(107, 114, 128)',
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal'
                          }}>
                            {student.email || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    {/* Group */}
                    <td style={{
                      padding: '12px 16px',
                      borderRight: '1px solid rgb(229, 231, 235)'
                    }}>
                      {student.group ? (
                        <span style={{ fontSize: '13px', color: 'rgb(44, 62, 80)' }}>
                          {student.group.name}
                        </span>
                      ) : (
                        <span style={{ color: 'rgb(156, 163, 175)', fontSize: '12px' }}>No Group</span>
                      )}
                    </td>
                    
                    {/* Position */}
                    <td style={{
                      padding: '12px 16px',
                      borderRight: '2px solid rgb(209, 213, 219)'
                    }}>
                      {student.group ? (
                        <span style={{ fontSize: '13px', color: 'rgb(44, 62, 80)' }}>
                          {student.group.role === 'leader' ? 'Leader' : 'Member'}
                        </span>
                      ) : (
                        <span style={{ color: 'rgb(156, 163, 175)', fontSize: '12px' }}>-</span>
                      )}
                    </td>
                    
                    {/* Grade columns */}
                    {gradeSheetData.projects.map(project => (
                      <React.Fragment key={project.id}>
                        {/* PROJECT SUBMISSION - TWO CELLS (Group Grade + Individual Grade) */}
                        {project.hasFinalSubmission && (
                          <>
                            {/* Group Grade */}
                            <td style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontSize: '14px',
                              backgroundColor: idx % 2 === 0 ? 'rgb(255, 255, 255)' : 'rgb(249, 250, 251)',
                              borderRight: '1px solid rgb(209, 213, 219)'
                            }}>
                              {(() => {
                                const gradeKey = `project-${project.id}`;
                                const gradeData = student.grades[gradeKey];
                                // Group grade is stored in gradeData.groupGrade
                                if (gradeData && gradeData.groupGrade !== null && gradeData.groupGrade !== undefined) {
                                  const groupGradeValue = gradeData.groupGrade;
                                  const maxGradeValue = gradeData.maxGrade;
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                      <div style={{
                                        display: 'inline-block',
                                        padding: '6px 12px',
                                        backgroundColor: groupGradeValue >= 75 ? 'rgb(220, 252, 231)' : 'rgb(254, 226, 226)',
                                        border: groupGradeValue >= 75 ? '1px solid rgb(110, 231, 183)' : '1px solid rgb(254, 202, 202)',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        color: groupGradeValue >= 75 ? 'rgb(22, 101, 52)' : 'rgb(153, 27, 27)'
                                      }}>
                                        {groupGradeValue}/{maxGradeValue}
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <span style={{ color: 'rgb(156, 163, 175)', fontSize: '13px' }}>-</span>
                                );
                              })()}
                            </td>
                            {/* Individual Grade */}
                            <td style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontSize: '14px',
                              backgroundColor: idx % 2 === 0 ? 'rgb(249, 250, 251)' : 'rgb(243, 244, 246)',
                              borderRight: '1px solid rgb(209, 213, 219)'
                            }}>
                              {(() => {
                                const gradeKey = `project-${project.id}`;
                                const gradeData = student.grades[gradeKey];
                                // Check if gradeData exists and has a grade value (including 0)
                                if (gradeData && (gradeData.grade !== null && gradeData.grade !== undefined)) {
                                  const gradeValue = typeof gradeData.grade === 'number' ? gradeData.grade : parseFloat(gradeData.grade);
                                  const maxGradeValue = typeof gradeData.maxGrade === 'number' ? gradeData.maxGrade : parseFloat(gradeData.maxGrade || 100);
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                      <div style={{
                                        display: 'inline-block',
                                        padding: '6px 12px',
                                        backgroundColor: gradeValue >= 75 ? 'rgb(220, 252, 231)' : 'rgb(254, 226, 226)',
                                        border: gradeValue >= 75 ? '1px solid rgb(110, 231, 183)' : '1px solid rgb(254, 202, 202)',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        color: gradeValue >= 75 ? 'rgb(22, 101, 52)' : 'rgb(153, 27, 27)'
                                      }}>
                                        {gradeValue}/{maxGradeValue}
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <span style={{ color: 'rgb(156, 163, 175)', fontSize: '13px' }}>-</span>
                                );
                              })()}
                            </td>
                          </>
                        )}
                        {/* THEN PHASES - TWO CELLS EACH */}
                        {Object.values(project.phases).sort((a, b) => a.number - b.number).map(phase => (
                          <React.Fragment key={phase.id}>
                            {/* Group Grade */}
                            <td style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontSize: '14px',
                              backgroundColor: idx % 2 === 0 ? 'rgb(255, 255, 255)' : 'rgb(249, 250, 251)',
                              borderRight: '1px solid rgb(229, 231, 235)'
                            }}>
                              {(() => {
                                const gradeKey = `phase-${phase.id}`;
                                const gradeData = student.grades[gradeKey];
                                // Group grade is stored in gradeData.groupGrade
                                if (gradeData && gradeData.groupGrade !== null && gradeData.groupGrade !== undefined) {
                                  const groupGradeValue = gradeData.groupGrade;
                                  const maxGradeValue = gradeData.maxGrade;
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                      <div style={{
                                        display: 'inline-block',
                                        padding: '6px 12px',
                                        backgroundColor: groupGradeValue >= 75 ? 'rgb(220, 252, 231)' : 'rgb(254, 226, 226)',
                                        border: groupGradeValue >= 75 ? '1px solid rgb(110, 231, 183)' : '1px solid rgb(254, 202, 202)',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        color: groupGradeValue >= 75 ? 'rgb(22, 101, 52)' : 'rgb(153, 27, 27)'
                                      }}>
                                        {groupGradeValue}/{maxGradeValue}
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <span style={{ color: 'rgb(156, 163, 175)', fontSize: '13px' }}>-</span>
                                );
                              })()}
                            </td>
                            {/* Individual Grade */}
                            <td style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontSize: '14px',
                              backgroundColor: idx % 2 === 0 ? 'rgb(249, 250, 251)' : 'rgb(243, 244, 246)',
                              borderRight: '1px solid rgb(229, 231, 235)'
                            }}>
                              {(() => {
                                const gradeKey = `phase-${phase.id}`;
                                const gradeData = student.grades[gradeKey];
                                // Check if gradeData exists and has a grade value (including 0)
                                if (gradeData && (gradeData.grade !== null && gradeData.grade !== undefined)) {
                                  const gradeValue = typeof gradeData.grade === 'number' ? gradeData.grade : parseFloat(gradeData.grade);
                                  const maxGradeValue = typeof gradeData.maxGrade === 'number' ? gradeData.maxGrade : parseFloat(gradeData.maxGrade || 100);
                                  return (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                      <div style={{
                                        display: 'inline-block',
                                        padding: '6px 12px',
                                        backgroundColor: gradeValue >= 75 ? 'rgb(220, 252, 231)' : 'rgb(254, 226, 226)',
                                        border: gradeValue >= 75 ? '1px solid rgb(110, 231, 183)' : '1px solid rgb(254, 202, 202)',
                                        borderRadius: '6px',
                                        fontWeight: '700',
                                        color: gradeValue >= 75 ? 'rgb(22, 101, 52)' : 'rgb(153, 27, 27)'
                                      }}>
                                        {gradeValue}/{maxGradeValue}
                                      </div>
                                    </div>
                                  );
                                }
                                return (
                                  <span style={{ color: 'rgb(156, 163, 175)', fontSize: '13px' }}>-</span>
                                );
                              })()}
                            </td>
                          </React.Fragment>
                        ))}
                      </React.Fragment>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!gradeSheetData.loading && gradeSheetData.students.length === 0 && (
          <div style={{
            position: 'relative',
            background: 'rgba(9, 18, 44, 0.15)',
            border: '0.1px solid rgb(95, 95, 95)',
            borderRadius: '0px',
            boxShadow: 'rgba(0, 0, 0, 0.5) 0px 4px 12px',
            backdropFilter: 'blur(3.2px) saturate(120%)',
            overflow: 'hidden'
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
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4rem 2rem',
              backgroundColor: 'rgb(255, 255, 255)',
              textAlign: 'center'
            }}>
              <FaClipboardList style={{ 
                fontSize: '4rem', 
                color: 'rgb(209, 213, 219)', 
                marginBottom: '1.5rem' 
              }} />
              <h3 style={{ 
                fontSize: '1.25rem', 
                fontWeight: '600', 
                color: 'rgb(44, 62, 80)', 
                margin: '0 0 0.75rem 0' 
              }}>
                No Students Enrolled
              </h3>
              <p style={{ 
                fontSize: '0.875rem', 
                color: 'rgb(107, 114, 128)', 
                maxWidth: '500px', 
                margin: 0 
              }}>
                Students need to be enrolled in this course to view grades.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderAnalytics() {
    return (
      <div className="analytics-content">
        <div className="content-header">
          <h3>Course Analytics</h3>
        </div>
        <div className="coming-soon">
          <FaChartBar size={64} />
          <p>Analytics dashboard coming soon</p>
        </div>
      </div>
    );
  }

  function renderCourseSettings() {
    return (
      <div className="settings-content">
        <div className="content-header">
          <h3>Course Settings</h3>
        </div>
        <div className="coming-soon">
          <FaCog size={64} />
          <p>Course settings coming soon</p>
        </div>
      </div>
    );
  }

  function renderBulkActions() {
    return (
      <div className="bulk-actions-content">
        <div className="content-header">
          <h3>Bulk Actions</h3>
        </div>
        <div className="coming-soon">
          <FaFileAlt size={64} />
          <p>Bulk actions coming soon</p>
        </div>
      </div>
    );
  }

  return (
    <div className="course-student-dashboard">
      {/* Squares Background */}
      <div className="squares-background">
        <Squares 
          direction="up"
          speed={0.25}
          squareSize={100}
          borderColor="#E17564" 
          hoverFillColor="#303030"
          className="w-full h-full"
        />
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="notifications-container">
          {notifications.map(notification => (
            <NotificationBanner key={notification.id} notification={notification} />
          ))}
        </div>
      )}

      <SidebarProvider
        style={{
          "--sidebar-width": "16rem",
          "--sidebar-width-collapsed": "0rem",
          "--header-height": "4rem",
        }}
      >
        <AppSidebar 
          variant="inset" 
          onTabChange={handleTabChange} 
          userType="professor" 
          activeTab={activeTab}
          courseInfo={course ? {
            course_name: course.course_name,
            course_code: course.course_code,
            section: course.section,
            semester: course.semester,
            school_year: course.school_year
          } : null}
          professorData={professorProfile ? {
            name: `${professorProfile.first_name} ${professorProfile.last_name}`,
            email: professorProfile.email,
            avatar: professorProfile.profile_image_url || null
          } : null}
        />
        <SidebarInset className="rounded-tl-lg">
          <SiteHeader title={getPageTitle()} />
          {renderContent()}
        </SidebarInset>
      </SidebarProvider>

      {/* Professor Dashboard Specific Styles - Override any conflicting styles */}
      <style>{`
        /* Force professor dashboard to use full width layout */
        .course-student-dashboard {
          display: block !important;
          min-height: 100vh !important;
          background-color: transparent !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Ensure SidebarProvider takes full width */
        .course-student-dashboard > div[data-sidebar-provider] {
          width: 100% !important;
          height: 100vh !important;
          display: flex !important;
          position: relative !important;
          z-index: 2 !important;
        }

        /* Force SidebarInset to take remaining width */
        [data-sidebar-inset] {
          flex: 1 !important;
          width: calc(100% - var(--sidebar-width)) !important;
          min-width: 0 !important;
          overflow: hidden !important;
          background: transparent !important;
        }

        /* Ensure main content area is properly sized */
        .flex-1 {
          flex: 1 !important;
          width: 100% !important;
          min-width: 0 !important;
          overflow-x: auto !important;
        }

        /* Override any old dashboard styles that might interfere */
        .dashboard-main,
        .main-content,
        .dashboard-sidebar,
        .sidebar-toggle-btn,
        .sidebar-header,
        .sidebar-nav,
        .nav-group,
        .nav-item {
          display: none !important;
        }

        /* Ensure content sections have proper width */
        .course-overview,
        .students-content,
        .groups-content,
        .projects-content,
        .grading-content,
        .announcements-content,
        .join-requests-content {
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        /* Fix any grid layouts that might be constrained */
        .stats-grid,
        .overview-grid,
        .projects-grid,
        .groups-grid,
        .students-grid {
          width: 100% !important;
          max-width: none !important;
        }

        /* Ensure responsive containers work properly */
        .projects-content-redesigned,
        .groups-content-redesigned,
        .announcements-content-redesigned {
          width: 100% !important;
          min-width: auto !important;
          max-width: none !important;
        }

        /* Fix main container layouts */
        .projects-main-container,
        .groups-main-container,
        .announcements-main-container {
          width: 100% !important;
          height: calc(100vh - 200px) !important;
          min-height: 600px !important;
        }

        /* Ensure panels take proper width */
        .projects-list-panel,
        .groups-list-panel,
        .announcements-list-panel {
          width: 450px !important;
          min-width: 450px !important;
          max-width: 450px !important;
        }

        .project-details-panel,
        .group-details-panel,
        .announcement-details-panel {
          flex: 1 !important;
          width: calc(100% - 450px) !important;
          min-width: 0 !important;
        }

        /* Responsive adjustments */
        @media (max-width: 1200px) {
          .projects-main-container,
          .groups-main-container,
          .announcements-main-container {
            flex-direction: column !important;
            height: auto !important;
          }
          
          .projects-list-panel,
          .groups-list-panel,
          .announcements-list-panel {
            width: 100% !important;
            min-width: auto !important;
            max-width: none !important;
            height: 400px !important;
          }
          
          .project-details-panel,
          .group-details-panel,
          .announcement-details-panel {
            width: 100% !important;
            height: auto !important;
          }
        }

        /* Ensure squares background doesn't interfere */
        .squares-background {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 1 !important;
          pointer-events: none !important;
          overflow: hidden !important;
        }

        .squares-background canvas {
          width: 100vw !important;
          height: 100vh !important;
          display: block !important;
          image-rendering: pixelated !important;
          image-rendering: -moz-crisp-edges !important;
        }

        /* Fix notification positioning */
        .notifications-container {
          position: fixed !important;
          top: 20px !important;
          right: 20px !important;
          z-index: 9999 !important;
          max-width: 400px !important;
        }

        /* Remove pink header section entirely */
        .pink-header-section {
          display: none !important;
          height: 0 !important;
          min-height: 0 !important;
          max-height: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
          overflow: hidden !important;
        }

        /* Style sidebar to match header color */
        [data-sidebar] {
          background-color: #09122C !important;
          border-right: 2.5px solid #BE3144 !important;
        }

        /* Override CourseStudentDashboard.css border removal */
        .group\/sidebar-wrapper [data-sidebar="sidebar"] {
          border-right: 2.5px solid #BE3144 !important;
        }

        /* Active/Selected sidebar item styling */
        [data-sidebar] [data-sidebar-menu-item][data-active="true"],
        [data-sidebar] [data-sidebar-menu-item].active,
        [data-sidebar] button[data-active="true"],
        [data-sidebar] a[data-active="true"],
        [data-sidebar] button.active,
        [data-sidebar] a.active,
        .group\/sidebar-wrapper [data-sidebar="sidebar"] button[data-active="true"],
        .group\/sidebar-wrapper [data-sidebar="sidebar"] a[data-active="true"],
        .group\/sidebar-wrapper [data-sidebar="sidebar"] button.active,
        .group\/sidebar-wrapper [data-sidebar="sidebar"] a.active {
          background-color: rgba(190, 49, 68, 0.2) !important;
          background: rgba(190, 49, 68, 0.2) !important;
          color: #FFFFFF !important;
        }

        /* Hover state for sidebar items */
        [data-sidebar] button:hover,
        [data-sidebar] a:hover,
        .group\/sidebar-wrapper [data-sidebar="sidebar"] button:hover,
        .group\/sidebar-wrapper [data-sidebar="sidebar"] a:hover {
          background-color: rgba(190, 49, 68, 0.15) !important;
          background: rgba(190, 49, 68, 0.15) !important;
          color: #FFFFFF !important;
        }

        /* OVERRIDE CourseStudentDashboard.css - Force active state to work */
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] button[data-active="true"],
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] a[data-active="true"],
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] button.active,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] a.active,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] [aria-current="page"],
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] [data-state="active"] {
          background-color: rgba(190, 49, 68, 0.2) !important;
          background: rgba(190, 49, 68, 0.2) !important;
          color: #FFFFFF !important;
        }

        /* Force hover state with maximum specificity */
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] button:hover,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] a:hover {
          background-color: rgba(190, 49, 68, 0.15) !important;
          background: rgba(190, 49, 68, 0.15) !important;
          color: #FFFFFF !important;
        }

        /* Ensure default buttons maintain transparent background */
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] button:not([data-active="true"]):not(.active):not(:hover),
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] a:not([data-active="true"]):not(.active):not(:hover) {
          background-color: transparent !important;
          background: transparent !important;
          color: #FFFFFF !important;
        }

        /* ACTIVE TAB PILL STYLING - Visual indicator for current selection */
        [data-sidebar] button[data-slot="sidebar-menu-button"],
        [data-sidebar] a[data-slot="sidebar-menu-button"] {
          border-radius: 8px !important;
          transition: all 0.2s ease !important;
        }

        /* When a sidebar item is clicked/active - PILL BACKGROUND */
        [data-sidebar] li[data-active="true"] button,
        [data-sidebar] li.active button,
        [data-sidebar] button.peer-data-active,
        [data-sidebar] button:active,
        .group\/menu-item[data-active="true"] button {
          background-color: rgba(190, 49, 68, 0.2) !important;
          background: rgba(190, 49, 68, 0.2) !important;
          border-radius: 8px !important;
          color: #FFFFFF !important;
        }

        /* Force maximum specificity for active state */
        html body .course-student-dashboard [data-sidebar] li[data-active="true"] button[data-slot="sidebar-menu-button"],
        html body .course-student-dashboard [data-sidebar] button[data-slot="sidebar-menu-button"]:active,
        html body .course-student-dashboard [data-sidebar] button[data-slot="sidebar-menu-button"][aria-pressed="true"] {
          background-color: rgba(190, 49, 68, 0.2) !important;
          background: rgba(190, 49, 68, 0.2) !important;
          border-radius: 8px !important;
          color: #FFFFFF !important;
        }

        /* NUCLEAR OPTION - Force active state on sidebar items */
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] li[data-active="true"] button,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] li.active button,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] .group\/menu-item[data-active="true"] button,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] .group\/menu-item.active button {
          background-color: rgba(190, 49, 68, 0.2) !important;
          background: rgba(190, 49, 68, 0.2) !important;
          border-radius: 8px !important;
          color: #FFFFFF !important;
        }

        /* Override ANY background on active items */
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar="sidebar"] li[data-active="true"] button,
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar="sidebar"] li.active button {
          background-color: rgba(190, 49, 68, 0.2) !important;
          background: rgba(190, 49, 68, 0.2) !important;
          background-image: none !important;
          border-radius: 8px !important;
          color: #FFFFFF !important;
        }

        /* Exception: Allow active state backgrounds to show through */
        [data-sidebar] *:not(li[data-active="true"] button):not(li.active button):not(button:hover):not(a:hover) {
          background-color: transparent !important;
        }

        /* Ensure sidebar content is visible */
        [data-sidebar] .sidebar-content,
        [data-sidebar] .sidebar-header,
        [data-sidebar] .sidebar-footer {
          background-color: transparent !important;
        }

        /* Style sidebar menu items */
        [data-sidebar] [data-sidebar-menu] {
          background-color: transparent !important;
        }

        [data-sidebar] [data-sidebar-menu-item] {
          background-color: transparent !important;
        }

        /* Style SiteHeader to match the new color */
        [data-site-header] {
          background-color: #872341 !important;
          color: #FFFFFF !important;
        }

        /* Style any header elements */
        .site-header {
          background-color: #872341 !important;
          color: #FFFFFF !important;
        }

        /* Style header content */
        [data-site-header] *,
        .site-header * {
          background-color: transparent !important;
        }

        /* Target specific header components */
        [data-site-header] .header,
        [data-site-header] .header-content,
        .site-header .header,
        .site-header .header-content {
          background-color: #872341 !important;
          color: #FFFFFF !important;
        }

        /* Style toggle button and title */
        [data-site-header] button,
        [data-site-header] h1,
        [data-site-header] h2,
        [data-site-header] h3,
        .site-header button,
        .site-header h1,
        .site-header h2,
        .site-header h3 {
          background-color: transparent !important;
          color: #FFFFFF !important;
        }

        /* General header styling - catch all header elements */
        header {
          background-color: #872341 !important;
          background: #872341 !important;
          background-image: none !important;
          border: none !important;
          border-bottom: 1px solid #BE3144 !important;
          color: #FFFFFF !important;
        }
          border-right: 1px solid #872341 !important;
          border-bottom-color: #872341 !important;
          border-right-color: #872341 !important;
        }

        header * {
          background-color: transparent !important;
        }

        /* Override the dashboard gradient background for header */
        .course-student-dashboard header {
          background: #872341 !important;
          background-color: #872341 !important;
          background-image: none !important;
          border: none !important;
          border-bottom: 1px solid #BE3144 !important;
          border-bottom-color: #BE3144 !important;
          color: #FFFFFF !important;
        }

        /* Force header to override any parent background */
        .course-student-dashboard .SidebarInset header {
          background: #872341 !important;
          background-color: #872341 !important;
          background-image: none !important;
          position: relative !important;
          z-index: 10 !important;
          border: none !important;
          border-bottom: 1px solid #BE3144 !important;
          border-bottom-color: #BE3144 !important;
          color: #FFFFFF !important;
        }

        /* Override CourseStudentDashboard.css conflicts */
        .group\/sidebar-wrapper {
          background: #09122C !important;
          --sidebar-background: #09122C !important;
          --sidebar-foreground: #FFFFFF !important;
          --sidebar-accent: rgba(135, 35, 65, 0.15) !important;
          --sidebar-accent-foreground: #FFFFFF !important;
          --sidebar-border: #BE3144 !important;
          border-right: 2.5px solid #BE3144 !important;
        }

        .group\/sidebar-wrapper [data-sidebar="sidebar"] {
          background: #09122C !important;
          --sidebar-background: #09122C !important;
          --sidebar-foreground: #FFFFFF !important;
        }

        /* Override CSS variables for the sidebar component */
        [data-sidebar] {
          --sidebar-background: #09122C !important;
          --sidebar-foreground: #FFFFFF !important;
          --sidebar-accent: rgba(135, 35, 65, 0.15) !important;
          --sidebar-accent-foreground: #FFFFFF !important;
          --sidebar-border: #BE3144 !important;
        }

        .group\/sidebar-wrapper [data-sidebar="sidebar"] .sidebar-header,
        .group\/sidebar-wrapper [data-sidebar="sidebar"] .sidebar-footer,
        .group\/sidebar-wrapper [data-sidebar="sidebar"] .sidebar-menu,
        .group\/sidebar-wrapper [data-sidebar="sidebar"] .sidebar-menu-item,
        .group\/sidebar-wrapper [data-sidebar="sidebar"] button,
        .group\/sidebar-wrapper [data-sidebar="sidebar"] a {
          background: #09122C !important;
          color: #FFFFFF !important;
        }

        /* Override header conflicts */
        .burgundy-header-section,
        div.burgundy-header-section,
        .flex.h-10.shrink-0.items-center.gap-2.px-6,
        div[class*="burgundy-header-section"],
        div[class*="flex"][class*="h-10"],
        .SidebarInset > div:first-child {
          background: #872341 !important;
          background-color: #872341 !important;
          border-bottom-color: #BE3144 !important;
        }

        /* Override any potential Tailwind or dynamic styles */
        .burgundy-header-section[style*="background"],
        div[class*="burgundy-header-section"][style*="background"] {
          background: #872341 !important;
          background-color: #872341 !important;
        }

        /* Maximum specificity override for header */
        body .group\/sidebar-wrapper .SidebarInset > div:first-child.burgundy-header-section,
        html body .group\/sidebar-wrapper .SidebarInset > div:first-child.burgundy-header-section {
          background: #872341 !important;
          background-color: #872341 !important;
        }

        /* Override any conflicting flexbox properties */
        .flex {
          display: flex !important;
        }

        /* Root level CSS variable overrides */
        :root {
          --sidebar-background: #09122C !important;
          --sidebar-foreground: #FFFFFF !important;
          --sidebar-accent: rgba(135, 35, 65, 0.15) !important;
          --sidebar-accent-foreground: #FFFFFF !important;
          --sidebar-border: #BE3144 !important;
        }

        /* Force sidebar background using CSS variables */
        .group\/sidebar-wrapper,
        [data-sidebar],
        [data-sidebar="sidebar"] {
          background-color: var(--sidebar-background) !important;
          background: var(--sidebar-background) !important;
          border-right: 2.5px solid #BE3144 !important;
        }

        /* Override CourseStudentDashboard.css border removal with maximum specificity */
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] {
          border-right: 2.5px solid #BE3144 !important;
        }

        /* NUCLEAR OPTION - Override the specific rule that sets border-right: none */
        .group\/sidebar-wrapper [data-sidebar="sidebar"] {
          border-right: 2.5px solid #BE3144 !important;
        }

        /* Even more specific override */
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar="sidebar"] {
          border-right: 2.5px solid #872341 !important;
        }

        /* Maximum specificity override */
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar="sidebar"] {
          border-right: 2.5px solid #872341 !important;
          border: none !important;
          border-right: 2.5px solid #872341 !important;
        }

        /* MAXIMUM AGGRESSIVE OVERRIDE - Force sidebar color with highest specificity */
        html body .course-student-dashboard .group\/sidebar-wrapper,
        html body .course-student-dashboard .group\/sidebar-wrapper *,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar],
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar] *,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"],
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] *,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] .sidebar-header,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] .sidebar-content,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] .sidebar-footer,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] .sidebar-menu,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] .sidebar-menu-item,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] button,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] a,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] div,
        html body .course-student-dashboard .group\/sidebar-wrapper [data-sidebar="sidebar"] span {

        /* IMPROVED GROUP MODAL STYLES */
        .group-modal-container-improved {
          background: white;
          border-radius: 16px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 900px;
          width: 90vw;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .group-modal-header-improved {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px 32px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
        }

        .group-modal-title-section-improved {
          flex: 1;
        }

        .group-modal-badge-improved {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.2);
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .group-modal-title-improved {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 16px 0;
          line-height: 1.2;
        }

        .group-modal-meta-improved {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .group-status-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .group-status-indicator-improved {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          background: rgba(255, 255, 255, 0.15);
        }

        .group-status-indicator-improved.complete {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .group-status-indicator-improved.incomplete {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .group-member-count-improved {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          opacity: 0.9;
        }

        .group-modal-close-improved {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: white;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .group-modal-close-improved:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(1.05);
        }

        .group-modal-body-improved {
          padding: 32px;
          flex: 1;
          overflow-y: auto;
        }

        .group-modal-grid-improved {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
          height: 100%;
        }

        .group-members-section-improved {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .section-header-improved {
          margin-bottom: 8px;
        }

        .section-title-improved {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 20px;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .section-subtitle-improved {
          color: #6b7280;
          font-size: 14px;
          margin: 0;
        }

        .leader-section-improved {
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
        }

        .leader-label-improved {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #f59e0b;
          margin-bottom: 16px;
        }

        .leader-card-improved {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .member-card-improved {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .member-card-improved:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
        }

        .member-card-improved.leader-card {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border-color: #f59e0b;
        }

        .member-avatar-improved {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          overflow: hidden;
          flex-shrink: 0;
        }

        .member-avatar-improved img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .avatar-placeholder-improved {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
        }

        .leader-badge-improved {
          position: absolute;
          bottom: -2px;
          right: -2px;
          background: #f59e0b;
          color: white;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
        }

        .member-info-improved {
          flex: 1;
          min-width: 0;
        }

        .member-name-improved {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .member-details-improved {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .student-number-improved {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .student-email-improved {
          font-size: 12px;
          color: #9ca3af;
        }

        .members-section-improved {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .members-label-improved {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .member-count-badge-improved {
          background: #667eea;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .members-grid-improved {
          display: grid;
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .member-card-improved.more-members {
          background: #f8fafc;
          border: 2px dashed #cbd5e1;
          justify-content: center;
          padding: 24px;
        }

        .more-members-content {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #6b7280;
        }

        .more-members-text {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .more-count {
          font-size: 18px;
          font-weight: 700;
          color: #667eea;
        }

        .more-label {
          font-size: 12px;
          color: #9ca3af;
        }

        .group-info-section-improved {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .info-cards-improved {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .info-card-improved {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s ease;
        }

        .info-card-improved:hover {
          border-color: #667eea;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
        }

        .info-card-header-improved {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 12px;
        }

        .info-card-content-improved {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .status-badge-improved {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          width: fit-content;
        }

        .status-badge-improved.complete {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge-improved.incomplete {
          background: #fef2f2;
          color: #991b1b;
        }

        .membership-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .membership-current {
          font-size: 18px;
          font-weight: 700;
          color: #1f2937;
        }

        .membership-limit {
          font-size: 14px;
          color: #6b7280;
        }

        .requirements-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .min-required {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .date-info {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .group-modal-footer-improved {
          background: #f8fafc;
          border-top: 1px solid #e5e7eb;
          padding: 24px 32px;
        }

        .footer-actions-improved {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        .btn-close-improved {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-close-improved:hover {
          background: #4b5563;
          transform: translateY(-1px);
        }

        .btn-delete-improved {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-delete-improved:hover {
          background: #dc2626;
          transform: translateY(-1px);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .group-modal-container-improved {
            width: 95vw;
            max-height: 90vh;
          }

          .group-modal-header-improved {
            padding: 20px 24px;
          }

          .group-modal-title-improved {
            font-size: 24px;
          }

          .group-modal-body-improved {
            padding: 24px;
          }

          .group-modal-grid-improved {
            grid-template-columns: 1fr;
            gap: 24px;
          }

          .group-modal-footer-improved {
            padding: 20px 24px;
          }

          .footer-actions-improved {
            flex-direction: column;
          }

          .btn-close-improved,
          .btn-delete-improved {
            width: 100%;
            justify-content: center;
          }
        }

        @media (max-width: 480px) {
          .group-modal-container-improved {
            width: 100vw;
            height: 100vh;
            border-radius: 0;
            max-height: 100vh;
          }

          .group-modal-header-improved {
            padding: 16px 20px;
          }

          .group-modal-body-improved {
            padding: 20px;
          }

          .group-modal-footer-improved {
            padding: 16px 20px;
          }
        }
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
          background-image: none !important;
        }

        /* Override any Tailwind classes */
        .bg-sidebar {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
        }

        /* Override any inline styles - EXCLUDE HEADER */
        .group\/sidebar-wrapper [style*="background"],
        [data-sidebar] [style*="background"] {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
        }

        /* NUCLEAR OPTION FOR HEADER - Override everything to force pink */
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header div,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header div div,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header div div div,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header button,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header h1,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header h2,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header h3,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header span,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header a {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
          background-image: none !important;
        }

        /* Force header container to be pink with maximum specificity */
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] > header {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
          background-image: none !important;
          position: relative !important;
          z-index: 10 !important;
          border-top-left-radius: 30px !important;
          border: 3px solid #EBE5C2 !important;
          border-bottom: none !important;
          border-right: none !important;
          border-bottom-left-radius: 0 !important;
          border-top-right-radius: 0 !important;
          overflow: hidden !important;
        }

        /* NUCLEAR OPTION - Override everything with maximum specificity */
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper,
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div,
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar],
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar] div,
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar] div[class*="sidebar"],
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar] div[class*="sidebar"] div,
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar] div[class*="sidebar"] div[class*="sidebar-header"],
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar] div[class*="sidebar"] div[class*="sidebar-content"],
        html body div.course-student-dashboard div[data-sidebar-provider] div.group\/sidebar-wrapper div[data-sidebar] div[class*="sidebar"] div[class*="sidebar-footer"] {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
          background-image: none !important;
        }

        /* Removed global sidebar background override that was affecting all modals */

        /* Override any potential CSS from other files */
        .group\/sidebar-wrapper div,
        .group\/sidebar-wrapper div div,
        .group\/sidebar-wrapper div div div {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
        }

        /* EXCLUDE HEADER FROM SIDEBAR OVERRIDES - Force header to be pink */
        [data-site-header],
        .site-header,
        header,
        [data-site-header] *,
        .site-header *,
        header *,
        [data-site-header] div,
        .site-header div,
        header div,
        [data-site-header] button,
        .site-header button,
        header button,
        [data-site-header] h1,
        [data-site-header] h2,
        [data-site-header] h3,
        .site-header h1,
        .site-header h2,
        .site-header h3,
        header h1,
        header h2,
        header h3 {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
        }

        /* Force header elements to be pink with maximum specificity */
        html body .course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header,
        html body .course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header *,
        html body .course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] div[data-site-header],
        html body .course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] div[data-site-header] *,
        html body .course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] .site-header,
        html body .course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] .site-header * {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
        }

        /* NUCLEAR OPTION FOR HEADER - Override everything to force pink */
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header div,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header div div,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header div div div,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header button,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header h1,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header h2,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header h3,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header span,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] header a {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
          background-image: none !important;
        }

        /* FORCE HEADER CONTAINER BACKGROUND - Target the actual header container */
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] > header,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] > div[data-site-header],
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] > .site-header,
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] > div[class*="header"],
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] > div[class*="site"],
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] > div:not(.pink-header-section):not(.flex-1) {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
          background-image: none !important;
        }

        /* Target any div that comes after pink-header-section but before flex-1 */
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] > div:nth-child(2),
        html body div.course-student-dashboard div[data-sidebar-provider] div[data-sidebar-inset] > div:nth-child(3) {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
          background-image: none !important;
        }

        /* DIRECT SITEHEADER OVERRIDE - Force the SiteHeader component background */
        .course-student-dashboard .SidebarInset > div:not(.pink-header-section):not(.flex-1),
        .course-student-dashboard .SidebarInset > div:not(.pink-header-section):not(.flex-1) *,
        .course-student-dashboard .SidebarInset > div:not(.pink-header-section):not(.flex-1) div,
        .course-student-dashboard .SidebarInset > div:not(.pink-header-section):not(.flex-1) div div {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
          background-image: none !important;
        }

        /* Override any potential CSS from SiteHeader component */
        div[data-sidebar-inset] > div:not(.pink-header-section):not(.flex-1),
        div[data-sidebar-inset] > div:not(.pink-header-section):not(.flex-1) *,
        div[data-sidebar-inset] > div:not(.pink-header-section):not(.flex-1) div,
        div[data-sidebar-inset] > div:not(.pink-header-section):not(.flex-1) div div,
        div[data-sidebar-inset] > div:not(.pink-header-section):not(.flex-1) div div div {
          background-color: #F8F3D9 !important;
          background: #F8F3D9 !important;
          background-image: none !important;
        }

        /* Ensure pink header section maintains consistent size */
        .pink-header-section.flex.h-6.shrink-0.items-center.gap-2.px-6 {
          height: 24px !important;
          min-height: 24px !important;
          max-height: 24px !important;
          flex-shrink: 0 !important;
          display: flex !important;
          align-items: center !important;
          box-sizing: border-box !important;
        }

        .flex-1 {
          flex: 1 1 0% !important;
        }

        /* Ensure parent containers don't affect pink header sizing */
        [data-sidebar-inset] > .pink-header-section {
          height: 24px !important;
          min-height: 24px !important;
          max-height: 24px !important;
          flex-shrink: 0 !important;
        }

        .w-full {
          width: 100% !important;
        }

        .h-full {
          height: 100% !important;
        }

        /* Ensure proper padding for content area */
        .p-4 {
          padding: 1rem !important;
        }

             /* Fix any overflow issues */
             .overflow-hidden {
               overflow: hidden !important;
             }

             .overflow-x-auto {
               overflow-x: auto !important;
             }

             .overflow-y-auto {
               overflow-y: auto !important;
             }

             /* Course Overview Styles */
             .course-overview {
               padding: 20px;
               max-width: 1200px;
               margin: 0 auto;
             }

             .overview-header {
               text-align: center;
               margin-bottom: 30px;
             }

             .overview-title {
               font-size: 2.5rem;
               font-weight: 700;
               color: #1f2937;
               margin: 0 0 10px 0;
             }

             .overview-subtitle {
               font-size: 1.1rem;
               color: #6b7280;
               margin: 0;
             }

             .stats-grid {
               display: grid;
               grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
               gap: 20px;
               margin-bottom: 40px;
             }

             .stat-card {
               background: white;
               border-radius: 12px;
               padding: 24px;
               box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
               border: 1px solid #e5e7eb;
               display: flex;
               align-items: center;
               gap: 16px;
               transition: all 0.2s ease;
             }

             .stat-card:hover {
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
             }

             .stat-icon {
               width: 48px;
               height: 48px;
               border-radius: 12px;
               display: flex;
               align-items: center;
               justify-content: center;
               font-size: 20px;
               color: white;
             }

             .stat-icon.students {
               background: linear-gradient(135deg, #3b82f6, #1d4ed8);
             }

             .stat-icon.groups {
               background: linear-gradient(135deg, #10b981, #059669);
             }

             .stat-icon.projects {
               background: linear-gradient(135deg, #f59e0b, #d97706);
             }

             .stat-icon.announcements {
               background: linear-gradient(135deg, #8b5cf6, #7c3aed);
             }

             .stat-content {
               flex: 1;
             }

             .stat-number {
               font-size: 2rem;
               font-weight: 700;
               color: #1f2937;
               margin: 0 0 4px 0;
             }

             .stat-label {
               font-size: 0.9rem;
               color: #6b7280;
               margin: 0 0 8px 0;
             }

             .stat-badge {
               display: inline-block;
               padding: 4px 8px;
               border-radius: 6px;
               font-size: 0.75rem;
               font-weight: 600;
               text-transform: uppercase;
               letter-spacing: 0.5px;
             }

             .stat-badge.pending {
               background: #fef3c7;
               color: #d97706;
             }

             .stat-badge.warning {
               background: #fecaca;
               color: #dc2626;
             }

             .stat-breakdown {
               display: flex;
               flex-wrap: wrap;
               gap: 8px;
               margin-top: 8px;
             }

             .breakdown-item {
               font-size: 0.75rem;
               padding: 2px 6px;
               border-radius: 4px;
               font-weight: 500;
             }

             .breakdown-item.active {
               background: #dcfce7;
               color: #166534;
             }

             .breakdown-item.completed {
               background: #dbeafe;
               color: #1e40af;
             }

             .breakdown-item.overdue {
               background: #fecaca;
               color: #dc2626;
             }

             .quick-access-section {
               margin-bottom: 40px;
             }

             .section-title {
               font-size: 1.5rem;
               font-weight: 600;
               color: #1f2937;
               margin: 0 0 20px 0;
             }

             .quick-access-grid {
               display: grid;
               grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
               gap: 16px;
             }

             .quick-access-btn {
               background: white;
               border: 1px solid #e5e7eb;
               border-radius: 12px;
               padding: 20px;
               text-align: left;
               cursor: pointer;
               transition: all 0.2s ease;
               display: flex;
               flex-direction: column;
               gap: 8px;
             }

             .quick-access-btn:hover {
               border-color: #3b82f6;
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
             }

             .quick-access-btn svg {
               font-size: 24px;
               color: #3b82f6;
             }

             .quick-access-btn span {
               font-size: 1.1rem;
               font-weight: 600;
               color: #1f2937;
             }

             .quick-access-btn small {
               font-size: 0.9rem;
               color: #6b7280;
             }

             .recent-activity-section {
               margin-bottom: 40px;
             }

             .activity-list {
               background: white;
               border-radius: 12px;
               border: 1px solid #e5e7eb;
               overflow: hidden;
             }

             .activity-item {
               display: flex;
               align-items: center;
               gap: 16px;
               padding: 16px 20px;
               border-bottom: 1px solid #f3f4f6;
             }

             .activity-item:last-child {
               border-bottom: none;
             }

             .activity-icon {
               width: 40px;
               height: 40px;
               border-radius: 8px;
               background: #f3f4f6;
               display: flex;
               align-items: center;
               justify-content: center;
               color: #6b7280;
             }

             .activity-content {
               flex: 1;
             }

             .activity-text {
               font-size: 0.9rem;
               color: #1f2937;
               margin: 0 0 4px 0;
             }

             .activity-time {
               font-size: 0.8rem;
               color: #6b7280;
             }

             .no-activity {
               padding: 40px 20px;
               text-align: center;
               color: #6b7280;
             }

             .project-status-section {
               margin-bottom: 40px;
             }

             .project-status-grid {
               display: grid;
               grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
               gap: 16px;
             }

             .status-card {
               background: white;
               border-radius: 12px;
               padding: 20px;
               text-align: center;
               border: 1px solid #e5e7eb;
               transition: all 0.2s ease;
             }

             .status-card:hover {
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
             }

             .status-card.active {
               border-color: #10b981;
             }

             .status-card.completed {
               border-color: #3b82f6;
             }

             .status-card.overdue {
               border-color: #ef4444;
             }

             .status-icon {
               width: 48px;
               height: 48px;
               border-radius: 12px;
               display: flex;
               align-items: center;
               justify-content: center;
               font-size: 20px;
               color: white;
               margin: 0 auto 12px auto;
             }

             .status-card.active .status-icon {
               background: linear-gradient(135deg, #10b981, #059669);
             }

             .status-card.completed .status-icon {
               background: linear-gradient(135deg, #3b82f6, #1d4ed8);
             }

             .status-card.overdue .status-icon {
               background: linear-gradient(135deg, #ef4444, #dc2626);
             }

             .status-number {
               font-size: 2rem;
               font-weight: 700;
               color: #1f2937;
               margin: 0 0 4px 0;
             }

             .status-label {
               font-size: 0.9rem;
               color: #6b7280;
               margin: 0;
             }

             .course-actions-section {
               margin-bottom: 40px;
             }

             .action-buttons {
               display: flex;
               flex-wrap: wrap;
               gap: 12px;
             }

             .action-btn {
               display: flex;
               align-items: center;
               gap: 8px;
               padding: 12px 20px;
               border-radius: 8px;
               font-weight: 500;
               cursor: pointer;
               transition: all 0.2s ease;
               border: none;
             }

             .action-btn.primary {
               background: linear-gradient(135deg, #3b82f6, #1d4ed8);
               color: white;
             }

             .action-btn.primary:hover {
               transform: translateY(-2px);
               box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
             }

             .action-btn.secondary {
               background: white;
               color: #374151;
               border: 1px solid #d1d5db;
             }

             .action-btn.secondary:hover {
               background: #f9fafb;
               border-color: #9ca3af;
             }

             /* Responsive Design */
             @media (max-width: 768px) {
               .course-overview {
                 padding: 16px;
               }

               .overview-title {
                 font-size: 2rem;
               }

               .stats-grid {
                 grid-template-columns: 1fr;
                 gap: 16px;
               }

               .quick-access-grid {
                 grid-template-columns: 1fr;
               }

               .project-status-grid {
                 grid-template-columns: 1fr;
               }

               .action-buttons {
                 flex-direction: column;
               }

               .action-btn {
                 justify-content: center;
               }
             }

            /* ==================== COURSE OVERVIEW REDESIGNED STYLES ==================== */
            .course-overview-redesigned {
              padding: 2rem;
              width: 100%;
              max-width: 100%;
            }

            /* Welcome Message - Landing Page Style with Georgia Font */
            .welcome-message-center {
              text-align: center;
              margin-bottom: 3rem;
              padding: 2rem 1rem;
            }

            .welcome-title-landing {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 3.5rem;
              font-weight: 700;
              color: #504B38;
              margin-bottom: 1rem;
              line-height: 1.2;
              letter-spacing: -0.02em;
            }

            .welcome-subtitle-landing {
              font-size: 1.25rem;
              color: #6B6654;
              font-weight: 400;
              max-width: 700px;
              margin: 0 auto;
              line-height: 1.6;
            }

            /* Stats Cards Grid - Top 4 Cards */
            .stats-cards-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 1.25rem;
              margin-bottom: 2rem;
              max-width: 1200px;
              margin-left: auto;
              margin-right: auto;
            }

            .stat-card-modern {
              background: rgba(9, 18, 44, 0.15);
              backdropFilter: 'blur(3.2px) saturate(120%)',
              WebkitBackdropFilter: 'blur(3.2px) saturate(120%)',
              border-radius: 14px;
              padding: 1.25rem;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
              transition: all 0.3s ease;
              border: 0.1px solid rgb(95, 95, 95);
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
            }

            .stat-card-modern:hover {
              transform: translateY(-3px);
              box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
              background: rgba(9, 18, 44, 0.25);
            }

            .stat-card-modern.clickable {
              cursor: pointer;
            }

            .stat-card-icon {
              width: 56px;
              height: 56px;
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.5rem;
              margin-bottom: 0.75rem;
            }

            .students-icon {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }

            .groups-icon {
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
            }

            .grading-icon {
              background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
              color: white;
            }

            .projects-icon {
              background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
              color: white;
            }

            .stat-card-content {
              flex: 1;
              width: 100%;
            }

            .stat-card-number {
              font-size: 2.5rem;
              font-weight: 800;
              color: #FFFFFF;
              margin-bottom: 0.375rem;
              line-height: 1;
            }

            .stat-card-label {
              font-size: 0.875rem;
              color: #FFFFFF;
              font-weight: 500;
              line-height: 1.4;
            }

            .stat-card-badge {
              display: inline-block;
              background: rgba(135, 35, 65, 0.3);
              color: #FFFFFF;
              padding: 0.25rem 0.625rem;
              border-radius: 10px;
              font-size: 0.7rem;
              font-weight: 600;
              margin-top: 0.5rem;
            }

            .stat-card-badge.warning {
              background: rgba(239, 68, 68, 0.3);
              color: #FFFFFF;
            }

            /* Horizontal Divider */
            .horizontal-divider {
              width: 100%;
              height: 1.5px;
              background: rgba(255, 255, 255, 0.2);
              margin: 2.5rem 0;
            }

            /* Quick Actions Section */
            .quick-actions-section {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 1.25rem;
              margin-bottom: 2rem;
              max-width: 1200px;
              margin-left: auto;
              margin-right: auto;
            }

            .quick-action-card {
              background: rgba(9, 18, 44, 0.15);
              backdropFilter: 'blur(3.2px) saturate(120%)',
              WebkitBackdropFilter: 'blur(3.2px) saturate(120%)',
              border: 0.1px solid rgb(95, 95, 95);
              border-radius: 14px;
              padding: 1.5rem;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 0.75rem;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
            }

            .quick-action-card:hover {
              transform: translateY(-3px);
              box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
              background: rgba(9, 18, 44, 0.25);
              border: 0.1px solid rgb(135, 35, 65);
            }

            .quick-action-icon {
              font-size: 2rem;
              color: #FFFFFF;
              transition: color 0.3s ease;
            }

            .quick-action-card:hover .quick-action-icon {
              color: #872341;
            }

            .quick-action-label {
              font-size: 0.95rem;
              font-weight: 600;
              color: #FFFFFF;
              text-align: center;
            }

            /* Info Cards Grid - 3 Cards */
            .info-cards-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1.5rem;
              margin-bottom: 2rem;
            }

            /* Graph Cards Grid - 2 Graphs */
            .graph-cards-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 1.5rem;
              margin-bottom: 2rem;
            }

            .graph-card-modern {
              background: rgba(9, 18, 44, 0.15);
              backdropFilter: 'blur(3.2px) saturate(120%)',
              WebkitBackdropFilter: 'blur(3.2px) saturate(120%)',
              border-radius: 16px;
              padding: 1.5rem;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
              border: 0.1px solid rgb(95, 95, 95);
            }

            .graph-card-header {
              margin-bottom: 1.5rem;
            }

            .graph-card-title {
              font-size: 1.25rem;
              font-weight: 600;
              color: #FFFFFF;
              margin-bottom: 0.25rem;
            }

            .graph-card-subtitle {
              font-size: 0.875rem;
              color: rgba(255, 255, 255, 0.7);
            }

            .graph-card-body {
              height: 300px;
              padding: 1rem 0;
            }


            .info-card-modern {
              position: relative;
              background: rgba(9, 18, 44, 0.6);
              backdrop-filter: blur(12px) saturate(180%);
              -webkit-backdrop-filter: blur(12px) saturate(180%);
              border-radius: 16px;
              padding: 1.5rem;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
              border: 2px solid rgba(190, 49, 68, 0.3);
              overflow: hidden;
            }

            /* Crosshair Corners for info cards */
            .info-card-modern .crosshair-corner {
              position: absolute;
              width: 22px;
              height: 22px;
              pointer-events: none;
              z-index: 10;
            }

            .info-card-modern .crosshair-corner.top-left {
              top: -1px;
              left: -1px;
            }

            .info-card-modern .crosshair-corner.top-right {
              top: -1px;
              right: -1px;
            }

            .info-card-modern .crosshair-corner.bottom-left {
              bottom: -1px;
              left: -1px;
            }

            .info-card-modern .crosshair-corner.bottom-right {
              bottom: -1px;
              right: -1px;
            }

            .info-card-modern .crosshair-h {
              position: absolute;
              background: #BE3144;
              height: 3px;
              width: 22px;
            }

            .info-card-modern .crosshair-v {
              position: absolute;
              background: #BE3144;
              width: 3px;
              height: 22px;
            }

            .info-card-modern .crosshair-corner.top-left .crosshair-h {
              top: 0;
              left: 0;
            }

            .info-card-modern .crosshair-corner.top-left .crosshair-v {
              top: 0;
              left: 0;
            }

            .info-card-modern .crosshair-corner.top-right .crosshair-h {
              top: 0;
              right: 0;
            }

            .info-card-modern .crosshair-corner.top-right .crosshair-v {
              top: 0;
              right: 0;
            }

            .info-card-modern .crosshair-corner.bottom-left .crosshair-h {
              bottom: 0;
              left: 0;
            }

            .info-card-modern .crosshair-corner.bottom-left .crosshair-v {
              bottom: 0;
              left: 0;
            }

            .info-card-modern .crosshair-corner.bottom-right .crosshair-h {
              bottom: 0;
              right: 0;
            }

            .info-card-modern .crosshair-corner.bottom-right .crosshair-v {
              bottom: 0;
              right: 0;
            }

            .info-card-header {
              padding: 1rem;
              background: #f8fafc;
              border-bottom: 1px solid #e2e8f0;
              display: flex;
              align-items: center;
              justify-content: space-between;
              cursor: pointer;
              transition: all 0.2s ease;
              margin: -1.5rem -1.5rem 1rem -1.5rem;
              border-radius: 14px 14px 0 0;
            }

            .info-card-header:hover {
              background: #f1f5f9;
            }

            .info-card-title {
              font-size: 1rem;
              font-weight: 600;
              color: #BE3144;
            }

            .requests-badge {
              background: rgba(135, 35, 65, 0.3);
              color: #FFFFFF;
              padding: 0.25rem 0.75rem;
              border-radius: 12px;
              font-size: 0.75rem;
              font-weight: 600;
            }

            .info-card-body {
              max-height: 300px;
              overflow-y: auto;
            }

            .info-card-item {
              display: flex;
              align-items: center;
              gap: 1rem;
              padding: 0.75rem;
              border-radius: 8px;
              margin-bottom: 0.5rem;
              transition: background 0.2s ease;
              background: rgba(135, 35, 65, 0.1);
            }

            .info-card-item:hover {
              background: rgba(135, 35, 65, 0.2);
            }

            /* Active Project Items - White Background */
            .info-card-item.active-project-item {
              background: rgba(255, 255, 255, 0.95);
              border: 1px solid rgba(190, 49, 68, 0.2);
              cursor: pointer;
              transition: all 0.3s ease;
            }

            .info-card-item.active-project-item:hover {
              background: rgba(255, 255, 255, 1);
              border-color: rgba(190, 49, 68, 0.4);
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(190, 49, 68, 0.15);
            }

            .info-card-item.active-project-item .item-icon {
              color: #BE3144;
            }

            .info-card-item.active-project-item .item-title {
              color: #2d3748;
            }

            .info-card-item.active-project-item .item-subtitle {
              color: #718096;
            }

            .info-card-item.clickable {
              cursor: pointer;
            }

            .item-icon {
              font-size: 1.25rem;
              color: #FFFFFF;
              flex-shrink: 0;
            }

            .item-icon.request-icon {
              color: #FFC0CB;
            }

            .item-content {
              flex: 1;
            }

            .item-title {
              font-size: 0.95rem;
              font-weight: 600;
              color: #FFFFFF;
              margin-bottom: 0.25rem;
            }

            .item-subtitle {
              font-size: 0.8rem;
              color: rgba(255, 255, 255, 0.7);
            }

            .submission-meta {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              margin-top: 0.25rem;
            }

            .submission-type-pill {
              display: inline-block;
              padding: 0.15rem 0.5rem;
              border-radius: 8px;
              font-size: 0.7rem;
              font-weight: 600;
              text-transform: uppercase;
            }

            .submission-type-pill.phase {
              background: rgba(59, 130, 246, 0.2);
              color: #93C5FD;
              border: 1px solid rgba(59, 130, 246, 0.3);
            }

            .submission-type-pill.project {
              background: rgba(168, 85, 247, 0.2);
              color: #C084FC;
              border: 1px solid rgba(168, 85, 247, 0.3);
            }

            .no-data-message {
              text-align: center;
              color: rgba(255, 255, 255, 0.7);
              padding: 2rem;
              font-style: italic;
            }

            .quick-action-btn {
              padding: 0.375rem 1rem;
              border: none;
              border-radius: 8px;
              font-size: 0.875rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .quick-action-btn.approve {
              background: #872341;
              color: white;
            }

            .quick-action-btn.approve:hover {
              background: #BE3144;
              transform: translateY(-1px);
            }

            /* Welcome Message */
            .welcome-message-center {
              text-align: center;
              margin-bottom: 2rem;
              padding: 1.5rem;
            }

            .welcome-title-landing {
              font-size: 2.5rem;
              font-weight: 700;
              color: #FFFFFF !important;
              margin-bottom: 0.5rem;
            }

            .welcome-subtitle-landing {
              font-size: 1.1rem;
              color: rgba(255, 255, 255, 0.8) !important;
              font-weight: 400;
            }

            /* Submission Tabs */
            .submission-tabs {
              display: flex;
              gap: 0.5rem;
              margin-bottom: 1rem;
            }

            .submission-tab {
              flex: 1;
              padding: 0.5rem 1rem;
              border: none;
              background: #F8F3D9;
              color: #504B38;
              border-radius: 8px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .submission-tab.active {
              background: #EBE5C2;
              color: #504B38;
            }

            .submission-tab:hover {
              background: #EBE5C2;
            }

            .submission-list {
              margin-top: 1rem;
            }

            /* Requirements */
            .requirement-item {
              display: flex;
              align-items: center;
              gap: 1rem;
              padding: 0.75rem;
              margin-bottom: 0.5rem;
            }

            .requirement-icon {
              font-size: 1.25rem;
              flex-shrink: 0;
            }

            .requirement-icon.complete {
              color: #10B981;
            }

            .requirement-icon.incomplete {
              color: #D1D5DB;
            }

            .requirement-text {
              font-size: 0.9rem;
              color: #504B38;
            }

            /* ===== STUDENTS SECTION - LANDING PAGE STYLE ===== */
            .students-content-redesigned {
              padding: 2rem;
              width: 100%;
              max-width: 100%;
            }

            /* ===== GRADING SECTION - SAME STYLE AS STUDENTS ===== */
            .grading-content-redesigned {
              padding: 2rem;
              width: 100%;
              max-width: 100%;
            }

            .students-page-header {
              margin-bottom: 2rem;
              text-align: center;
            }

            .students-page-title {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 2.5rem;
              font-weight: 700;
              color: #FFFFFF;
              margin-bottom: 0.5rem;
            }

            .students-page-subtitle {
              font-size: 1.1rem;
              color: rgba(255, 255, 255, 0.8);
              font-weight: 400;
            }

            .students-main-card-landing {
              display: grid;
              grid-template-columns: 400px 1fr;
              gap: 2rem;
              background: rgba(9, 18, 44, 0.15);
              backdropFilter: 'blur(3.2px) saturate(120%)',
              WebkitBackdropFilter: 'blur(3.2px) saturate(120%)',
              border-radius: 16px;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
              border: 0.1px solid rgb(95, 95, 95);
              overflow: hidden;
              min-height: 600px;
            }

            .students-list-panel-landing {
              background: rgba(9, 18, 44, 0.2);
              border-right: 1px solid rgba(255, 255, 255, 0.1);
              display: flex;
              flex-direction: column;
            }

            .students-list-header-landing {
              padding: 1.5rem;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
              display: flex;
              justify-content: space-between;
              align-items: center;
            }

            .students-list-header-landing h4 {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 1.5rem;
              color: #FFFFFF;
              margin: 0;
            }

            .sort-dropdown-landing {
              padding: 0.5rem 1rem;
              border: 0.1px solid rgb(95, 95, 95);
              border-radius: 8px;
              background: rgba(9, 18, 44, 0.15);
              color: #FFFFFF;
              font-size: 0.9rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.3s ease;
            }

            .sort-dropdown-landing:hover {
              border-color: rgb(135, 35, 65);
              box-shadow: 0 2px 8px rgba(135, 35, 65, 0.2);
            }

            .sort-dropdown-landing:focus {
              outline: none;
              border-color: rgb(135, 35, 65);
              box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.2);
            }

            .students-list-scroll-landing {
              flex: 1;
              overflow-y: auto;
              padding: 1rem;
            }

            .students-list-landing {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            }

            .student-pill-landing {
              display: flex;
              align-items: center;
              gap: 1rem;
              padding: 1rem;
              background: rgba(135, 35, 65, 0.15);
              border: 0.1px solid rgba(255, 255, 255, 0.2);
              border-radius: 12px;
              cursor: pointer;
              transition: all 0.3s ease;
            }

            .student-pill-landing:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(135, 35, 65, 0.2);
              border-color: rgb(135, 35, 65);
              background: rgba(135, 35, 65, 0.25);
            }

            .student-pill-landing.selected {
              background: linear-gradient(135deg, #872341 0%, #BE3144 100%);
              border-color: #BE3144;
              color: white;
            }

            .student-pill-number-landing {
              font-size: 1.1rem;
              font-weight: 700;
              color: #FFFFFF;
              min-width: 30px;
            }

            .student-pill-landing.selected .student-pill-number-landing {
              color: white;
            }

            .student-pill-avatar-landing {
              position: relative;
              width: 48px;
              height: 48px;
              border-radius: 50%;
              overflow: hidden;
              flex-shrink: 0;
            }

            .student-pill-avatar-landing img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .avatar-placeholder-landing {
              width: 100%;
              height: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              background: linear-gradient(135deg, #872341 0%, #BE3144 100%);
              color: white;
              font-weight: 600;
              font-size: 1rem;
            }

            .avatar-placeholder-landing.large {
              width: 120px;
              height: 120px;
              font-size: 2.5rem;
            }

            .student-pill-info-landing {
              flex: 1;
            }

            .student-name-landing {
              font-weight: 600;
              font-size: 0.95rem;
              color: #FFFFFF;
              margin-bottom: 0.25rem;
            }

            .student-pill-landing.selected .student-name-landing {
              color: white;
            }

            .student-number-landing {
              font-size: 0.85rem;
              color: rgba(255, 255, 255, 0.7);
            }

            .student-pill-landing.selected .student-number-landing {
              color: rgba(255, 255, 255, 0.9);
            }

            .student-pill-status-landing {
              display: flex;
              align-items: center;
            }

            .status-triangle-landing {
              width: 16px;
              height: 16px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
              font-weight: bold;
              color: #FFFFFF;
              cursor: pointer;
              transition: all 0.2s ease;
            }

            .status-triangle-landing:hover {
              color: #FFFFFF;
              transform: scale(1.1);
            }

            .status-triangle-landing.assigned {
              color: #FFFFFF;
            }

            .status-triangle-landing.unassigned {
              color: #FFFFFF;
            }

            .empty-students-list-landing {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 3rem;
              text-align: center;
              color: rgba(255, 255, 255, 0.7);
            }

            /* Student Details Panel - Landing Style */
            .student-details-panel-landing {
              padding: 2rem;
              overflow-y: auto;
              background: rgba(9, 18, 44, 0.1);
            }

            .student-profile-landing {
              display: flex;
              flex-direction: column;
              gap: 2rem;
            }

            .profile-header-landing {
              display: flex;
              gap: 2rem;
              align-items: flex-start;
              padding-bottom: 2rem;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .profile-avatar-landing {
              position: relative;
              width: 120px;
              height: 120px;
              border-radius: 16px;
              overflow: hidden;
              flex-shrink: 0;
              box-shadow: 0 4px 12px rgba(135, 35, 65, 0.2);
            }

            .profile-avatar-landing img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }

            .profile-basic-info-landing {
              flex: 1;
            }

            .profile-basic-info-landing h2 {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 1.75rem;
              color: #FFFFFF;
              margin: 0 0 0.5rem 0;
              font-weight: 700;
            }

            .student-number-large-landing {
              font-size: 1rem;
              color: rgba(255, 255, 255, 0.7);
              font-weight: 600;
              margin-bottom: 0.5rem;
            }

            .student-email-landing {
              font-size: 0.95rem;
              color: #6B6654;
              margin-bottom: 0.5rem;
            }

            .student-program-landing {
              font-size: 0.9rem;
              color: #6B6654;
            }

            .profile-details-landing {
              display: flex;
              flex-direction: column;
              gap: 1.5rem;
            }

            .detail-section-landing {
              background: #F8F3D9;
              padding: 1.5rem;
              border-radius: 12px;
              border: 1.5px solid #EBE5C2;
            }

            .detail-section-landing h4 {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 1.25rem;
              color: #504B38;
              margin: 0 0 1rem 0;
              font-weight: 700;
            }

            /* Action Buttons Row */
            .action-buttons-row {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 1rem;
              margin-bottom: 1.5rem;
              flex-wrap: wrap;
            }

            .registration-card-floating {
              flex: 0 0 auto;
            }

            .registration-card-floating-btn {
              display: inline-flex;
              align-items: center;
              gap: 0.75rem;
              padding: 0.875rem 1.5rem;
              background: linear-gradient(135deg, #B9B28A 0%, #504B38 100%);
              color: white;
              border-radius: 8px;
              text-decoration: none;
              font-weight: 600;
              font-size: 1rem;
              transition: all 0.3s ease;
              box-shadow: 0 4px 12px rgba(80, 75, 56, 0.3);
            }

            .registration-card-floating-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 16px rgba(80, 75, 56, 0.4);
            }

            .document-missing-floating {
              color: #9CA3AF;
              font-style: italic;
              padding: 0.875rem 1.5rem;
              background: #F3F4F6;
              border-radius: 8px;
              border: 1px solid #E5E7EB;
            }

            .detail-grid-landing {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 1rem;
            }

            .detail-item-landing {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
            }

            .detail-item-landing label {
              font-size: 0.875rem;
              font-weight: 600;
              color: #6B6654;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .detail-item-landing span {
              font-size: 1rem;
              color: #504B38;
              font-weight: 500;
            }

            .status-badge-landing {
              display: inline-block;
              padding: 0.375rem 0.875rem;
              border-radius: 6px;
              font-size: 0.875rem;
              font-weight: 600;
            }

            .status-badge-landing.enrolled {
              background: #D1FAE5;
              color: #065F46;
            }

            .status-badge-landing.leader {
              background: #DBEAFE;
              color: #1E40AF;
            }

            .status-badge-landing.member {
              background: #E0E7FF;
              color: #3730A3;
            }

            .group-assignment-landing {
              display: flex;
              flex-direction: column;
            }

            .group-info-landing {
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
            }

            .group-number-landing {
              font-size: 1rem;
              font-weight: 600;
              color: #504B38;
            }

            .group-role-text-landing {
              font-size: 0.875rem;
              color: #6B6654;
              font-weight: 500;
            }

            .unassigned-landing {
              color: #F59E0B;
              font-weight: 500;
            }

            .performance-summary-landing {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 1rem;
            }

            .perf-item-landing {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
              text-align: center;
            }

            .perf-item-landing label {
              font-size: 0.875rem;
              font-weight: 600;
              color: #6B6654;
            }

            .perf-item-landing span {
              font-size: 1.5rem;
              color: #B9B28A;
              font-weight: 700;
            }

            .profile-actions-landing {
              display: flex;
              gap: 0.75rem;
              flex-wrap: wrap;
              align-items: center;
              flex: 1;
              justify-content: center;
            }

            .btn-landing {
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              padding: 0.75rem 1rem;
              border-radius: 8px;
              font-weight: 600;
              font-size: 0.9rem;
              cursor: pointer;
              transition: all 0.3s ease;
              text-decoration: none;
              flex: 0 0 auto;
              min-width: fit-content;
            }

            .btn-outline-landing {
              background: white;
              color: #504B38;
              border: 1.5px solid #B9B28A;
            }

            .btn-outline-landing:hover {
              background: #F8F3D9;
              border-color: #504B38;
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(80, 75, 56, 0.15);
            }

            .no-student-selected-landing {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              padding: 3rem;
              text-align: center;
              color: #6B6654;
            }

            .no-student-selected-landing h3 {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 1.5rem;
              color: #504B38;
              margin: 1rem 0 0.5rem 0;
            }

            .no-student-selected-landing p {
              color: #9CA3AF;
            }

            /* ===== GROUPS SECTION - LANDING PAGE STYLE ===== */
            .groups-content-landing {
              padding: 2rem;
              width: 100%;
              max-width: 100%;
            }

            .groups-page-header {
              margin-bottom: 2rem;
              text-align: center;
            }

            .groups-page-title {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 2.5rem;
              font-weight: 700;
              color: #504B38;
              margin-bottom: 0.5rem;
            }

            .groups-page-subtitle {
              font-size: 1.1rem;
              color: #6B6654;
              font-weight: 400;
            }

            .groups-create-section {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 2rem 0;
            }

            .btn-create-groups-landing {
              display: inline-flex;
              align-items: center;
              gap: 0.75rem;
              padding: 1rem 2rem;
              background: linear-gradient(135deg, #B9B28A 0%, #504B38 100%);
              color: white;
              border: none;
              border-radius: 12px;
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 1.125rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 4px 12px rgba(80, 75, 56, 0.3);
            }

            .btn-create-groups-landing:hover {
              transform: translateY(-3px);
              box-shadow: 0 8px 20px rgba(80, 75, 56, 0.4);
            }

            .horizontal-divider-groups {
              width: 100%;
              height: 2px;
              background: #EBE5C2;
              margin: 2rem 0;
            }

            .groups-cards-container-landing {
              margin-top: 2rem;
            }

            .groups-grid-landing {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
              gap: 2rem;
              padding: 1rem 0;
            }

            .group-card-landing {
              background: white;
              border: 2px solid #EBE5C2;
              border-radius: 16px;
              padding: 2rem;
              cursor: pointer;
              transition: all 0.3s ease;
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1.5rem;
            }

            .group-card-landing:hover {
              transform: translateY(-5px);
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
              border-color: #B9B28A;
            }

            .group-number-hero {
              width: 100px;
              height: 100px;
              border-radius: 50%;
              background: #B9B28A; /* solid color per request */
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 3rem;
              font-weight: 700;
              box-shadow: 0 4px 12px rgba(80, 75, 56, 0.3);
            }

            .group-card-content {
              width: 100%;
              display: flex;
              flex-direction: column;
              gap: 1rem;
              text-align: center;
            }

            .group-name-landing {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 1.5rem;
              font-weight: 700;
              color: #504B38;
              margin: 0;
            }

            .group-leader-landing {
              display: flex;
              flex-direction: column;
              gap: 0.25rem;
              padding: 0.75rem;
              background: #F8F3D9;
              border-radius: 8px;
            }

            .leader-label {
              font-size: 0.875rem;
              font-weight: 600;
              color: #6B6654;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .leader-name {
              font-size: 1rem;
              font-weight: 600;
              color: #504B38;
            }

            .group-stats-landing {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 1rem;
              padding-top: 1rem;
              border-top: 2px solid #EBE5C2;
            }

            .group-members-list-landing {
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
              padding: 0.75rem;
              background: #F8F3D9;
              border-radius: 8px;
              border: 1px solid #EBE5C2;
              margin-top: 0.5rem;
            }

            .members-label {
              font-size: 0.875rem;
              font-weight: 600;
              color: #6B6654;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }

            .members-names {
              display: flex;
              flex-wrap: wrap;
              gap: 0.375rem 0.75rem;
            }

            .member-name-item {
              font-size: 0.95rem;
              font-weight: 500;
              color: #504B38;
            }

            /* Group Details Modal - compact styling and z-index above sidebar */
            .modal-overlay,
            .modal-overlay-landing {
              position: fixed;
              inset: 0;
              background: rgba(0,0,0,0.55);
              backdrop-filter: blur(2px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 99999; /* ensure above sidebar */
              padding: 1rem;
            }

            .modal-content-simple {
              width: 92%;
              max-width: 820px; /* smaller */
              max-height: none; /* no internal scrolling */
              background: #fff;
              border-radius: 14px;
              overflow: hidden;
              box-shadow: 0 20px 60px rgba(0,0,0,0.35);
              display: flex;
              flex-direction: column;
            }

            /* New compact group modal container (matches LandingPage aesthetic) */
            .group-modal-container-compact {
              width: 96%;
              max-width: 1080px;
              background: #FFFFFF;
              border-radius: 16px;
              box-shadow: 0 24px 60px rgba(0,0,0,0.28);
              border: 2px solid #EBE5C2;
              overflow: hidden;
              display: flex;
              flex-direction: column;
            }

            .group-modal-header-compact {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 0.75rem;
              padding: 16px 20px;
              background: #F8F3D9;
              border-bottom: 2px solid #EBE5C2;
            }

            .group-modal-title-section {
              display: flex;
              align-items: center;
              gap: 0.75rem;
            }

            .group-modal-badge {
              padding: 0.25rem 0.6rem;
              background: #B9B28A;
              color: white;
              border-radius: 999px;
              font-weight: 700;
              font-size: 0.85rem;
              font-family: Georgia, 'Times New Roman', serif;
            }

            .group-modal-title-compact {
              margin: 0;
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 1.35rem;
              font-weight: 700;
              color: #504B38;
            }

            .group-modal-meta-compact {
              display: flex;
              align-items: center;
              gap: 0.75rem;
            }

            .group-status-indicator {
              padding: 0.25rem 0.6rem;
              border-radius: 8px;
              font-size: 0.8rem;
              font-weight: 700;
            }
            .group-status-indicator.complete { background: #D1FAE5; color: #065F46; }
            .group-status-indicator.incomplete { background: #FEF3C7; color: #92400E; }

            .group-member-count {
              display: inline-flex;
              align-items: center;
              gap: 0.4rem;
              color: #6B6654;
              font-weight: 600;
              font-size: 0.85rem;
            }

            .group-modal-close {
              width: 34px;
              height: 34px;
              border-radius: 50%;
              border: 2px solid #B9B28A;
              background: white;
              color: #504B38;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.2s ease;
            }
            .group-modal-close:hover { background: #F8F3D9; }

            .group-modal-body-compact {
              padding: 22px 24px;
              background: #FFFFFF;
            }

            .group-modal-grid-compact {
              display: grid;
              grid-template-columns: 1.3fr 0.7fr;
              gap: 20px;
            }

            .section-header-compact h3 {
              margin: 0;
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 1rem;
              font-weight: 700;
              color: #504B38;
            }

            .leader-row-compact, .members-row-compact {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            }
            .leader-row-compact > label,
            .members-row-compact > label {
              font-size: 0.85rem;
              font-weight: 700;
              color: #6B6654;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }

            /* Member card grid */
            .member-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
            .member-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: #FFFFFF; border: 1px solid #E3DCB5; border-radius: 12px; transition: box-shadow .15s ease, transform .15s ease; }
            .member-card.leader { background: #F8F3D9; border-color: #E3DCB5; }
            .member-card:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(0,0,0,0.08); }
            .mc-avatar { width: 42px; height: 42px; border-radius: 50%; overflow: hidden; background: #B9B28A; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; }
            .mc-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
            .mc-avatar-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
            .mc-main { display: flex; flex-direction: column; min-width: 0; }
            .mc-name { font-weight: 700; color: #504B38; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
            .mc-sub { font-size: 0.85rem; color: #6B6654; overflow: hidden; text-overflow: ellipsis; }

            .group-info-section-compact .info-grid-compact {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px 16px;
              background: #F8F3D9;
              padding: 14px;
              border: 2px solid #EBE5C2;
              border-radius: 10px;
            }
            .info-item-compact { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
            .info-item-compact > label { font-size: 0.85rem; font-weight: 700; color: #6B6654; }
            .info-item-compact .info-value { font-weight: 700; color: #504B38; }
            .status-pill { padding: 0.25rem 0.6rem; border-radius: 8px; font-size: 0.8rem; font-weight: 700; }
            .status-pill.complete { background: #D1FAE5; color: #065F46; }
            .status-pill.incomplete { background: #FEF3C7; color: #92400E; }

            .group-modal-footer-compact {
              display: flex;
              justify-content: flex-end;
              gap: 0.5rem;
              padding: 12px 16px;
              border-top: 2px solid #EBE5C2;
              background: #F8F3D9;
            }
            .btn-close-compact,
            .btn-delete-compact {
              padding: 10px 14px;
              border-radius: 999px; /* pill */
              font-weight: 700;
              cursor: pointer;
              transition: background-color .15s ease, color .15s ease, box-shadow .15s ease, transform .1s ease;
              box-shadow: 0 2px 6px rgba(0,0,0,0.05);
            }
            .btn-close-compact {
              border: 2px solid #B9B28A;
              background: #FFFFFF;
              color: #504B38;
            }
            .btn-close-compact:hover {
              background: #B9B28A;
              color: #FFFFFF;
              box-shadow: 0 6px 14px rgba(80,75,56,0.18);
            }
            .btn-close-compact:focus { outline: none; box-shadow: 0 0 0 3px rgba(185,178,138,0.35); }
            .btn-delete-compact {
              border: 2px solid #DC2626;
              background: #DC2626;
              color: #FFFFFF;
            }
            .btn-delete-compact:hover {
              background: #B91C1C;
              border-color: #B91C1C;
              box-shadow: 0 6px 14px rgba(220,38,38,0.25);
            }
            .btn-delete-compact:focus { outline: none; box-shadow: 0 0 0 3px rgba(220,38,38,0.25); }

            @media (max-width: 768px) {
              .group-modal-container-compact { max-width: 96%; }
              .group-modal-grid-compact { grid-template-columns: 1fr; }
            }

            .modal-header-simple {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 12px 16px; /* compact */
              background: #F8F3D9;
              border-bottom: 2px solid #EBE5C2;
            }

            .modal-title-section .modal-group-name {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 1.25rem;
              font-weight: 700;
              color: #504B38;
            }

            .modal-close-simple {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              border: none;
              background: #B9B28A;
              color: #fff;
              font-size: 1.5rem;
              line-height: 1;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .modal-close-simple:hover {
              background: #504B38;
              transform: scale(1.05);
            }

            .modal-body-simple {
              padding: 12px 16px; /* compact */
            }

            .modal-two-column {
              display: grid;
              grid-template-columns: 1fr 1fr; /* tighter */
              gap: 10px; /* compact */
            }

            .modal-right-column, .modal-left-column {
              display: flex;
              flex-direction: column;
              gap: 10px;
            }

            .group-details-section {
              background: #F8F3D9;
              padding: 12px;
              border-radius: 10px;
              border: 2px solid #EBE5C2;
            }

            .group-number-display {
              font-family: Georgia, 'Times New Roman', serif;
              font-size: 1.125rem;
              font-weight: 700;
              color: #504B38;
              text-align: center;
              padding: 0.75rem;
              background: white;
              border-radius: 8px;
              border: 2px solid #B9B28A;
            }

            .group-info-list .info-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 0.5rem 0;
              border-bottom: 1px solid #EBE5C2;
            }

            .group-info-list .info-row:last-child {
              border-bottom: none;
            }

            .group-info-list .info-label {
              font-size: 0.875rem;
              font-weight: 600;
              color: #6B6654;
            }

            .group-info-list .info-value {
              font-size: 0.95rem;
              font-weight: 600;
              color: #504B38;
            }

            .member-count-landing {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              font-size: 0.95rem;
              color: #6B6654;
              font-weight: 600;
            }

            .status-badge-group-landing {
              padding: 0.375rem 0.875rem;
              border-radius: 8px;
              font-size: 0.875rem;
              font-weight: 600;
            }

            .status-badge-group-landing.complete {
              background: #D1FAE5;
              color: #065F46;
            }

            .status-badge-group-landing.incomplete {
              background: #FEF3C7;
              color: #92400E;
            }

            /* Responsive Design */
            @media (max-width: 1200px) {
              .stats-cards-grid,
              .quick-actions-section {
                grid-template-columns: repeat(2, 1fr);
              }

              .info-cards-grid {
                grid-template-columns: 1fr;
              }

              .students-main-card-landing {
                grid-template-columns: 1fr;
              }

              .students-list-panel-landing {
                border-right: none;
                border-bottom: 2px solid #EBE5C2;
              }

              .action-buttons-row {
                flex-direction: column;
                align-items: center;
                gap: 1rem;
              }

              .profile-actions-landing {
                justify-content: center;
                flex: none;
              }

              .registration-card-floating {
                flex: none;
              }

              .groups-grid-landing {
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 1.5rem;
              }

              .btn-create-groups-landing {
                font-size: 1rem;
                padding: 0.875rem 1.75rem;
              }
            }

            @media (max-width: 768px) {
              .stats-cards-grid,
              .quick-actions-section,
              .graph-cards-grid,
              .info-cards-grid {
                grid-template-columns: 1fr;
              }

              .welcome-title-landing {
                font-size: 2.25rem;
              }

              .welcome-subtitle-landing {
                font-size: 1.05rem;
              }

              .graph-card-body {
                height: 200px;
              }

              .course-overview-redesigned {
                padding: 1rem;
              }

              .stat-card-number {
                font-size: 2rem;
              }

              .stat-card-label {
                font-size: 0.8rem;
              }

              .quick-action-icon {
                font-size: 1.75rem;
              }

              .quick-action-label {
                font-size: 0.875rem;
              }

              .action-buttons-row {
                flex-direction: column;
                gap: 0.75rem;
              }

              .profile-actions-landing {
                flex-direction: column;
                gap: 0.5rem;
              }

              .btn-landing {
                padding: 0.625rem 0.875rem;
                font-size: 0.85rem;
              }

              .groups-grid-landing {
                grid-template-columns: 1fr;
                gap: 1rem;
              }

              .group-number-hero {
                width: 80px;
                height: 80px;
                font-size: 2.5rem;
              }

              .groups-page-title {
                font-size: 2rem;
              }

              .btn-create-groups-landing {
                font-size: 0.95rem;
                padding: 0.75rem 1.5rem;
              }
            }
           `}</style>

      {/* Projects and Announcements Specific Styles - IMPORTANT: Do not remove! */}
      <style>{`
        /* Projects Section Styles */
        .projects-content-redesigned {
          background: transparent;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: hidden;
          min-width: auto;
          width: 100%;
        }

        .projects-header {
          padding: 16px 24px;
          border-bottom: 1px solid #e1e5e9;
          background: #f8f9fa;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .projects-header h3 {
          margin: 0;
          color: #1f2937;
          font-size: 20px;
          font-weight: 600;
        }

        .projects-main-container {
          display: flex;
          height: calc(100vh - 200px);
          min-height: 600px;
          width: 100%;
        }

        .projects-list-panel {
          width: 450px;
          min-width: 450px;
          max-width: 450px;
          border-right: 1px solid #e1e5e9;
          display: flex;
          flex-direction: column;
          background: #f9fafb;
        }

        .list-header {
          padding: 1.5rem;
          border-bottom: 2px solid #EBE5C2;
          background: transparent;
        }

        .filter-tabs {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }

        .filter-tab {
          padding: 8px 16px;
          border: 2px solid #EBE5C2;
          background: white;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #6B6654;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .filter-tab:hover {
          background: #FFFEF9;
          border-color: #B9B28A;
          transform: translateY(-1px);
        }

        .filter-tab.active {
          background: linear-gradient(135deg, #B9B28A 0%, #A39F7A 100%);
          color: white;
          border-color: #B9B28A;
        }

        .search-container {
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 10px 40px 10px 40px;
          border: 2px solid #EBE5C2;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s;
          box-sizing: border-box;
          background: white;
        }

        .search-input::placeholder {
          color: #9ca3af;
          font-size: 14px;
        }

        .search-input:focus {
          outline: none;
          border-color: #B9B28A;
          box-shadow: 0 0 0 3px rgba(185, 178, 138, 0.1);
        }

        .search-icon {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
        }

        .projects-list-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .projects-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .project-pill {
          background: white;
          border: 1px solid #e1e5e9;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
          min-height: 140px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .project-pill:hover {
          background: #f0f9ff;
          border-color: #3b82f6;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .project-pill.selected {
          background: #eff6ff;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .project-pill-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .project-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          flex: 1;
          line-height: 1.3;
        }

        .project-status-badge {
          margin-left: 8px;
        }

        .status {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .status.current {
          background: #dcfce7;
          color: #166534;
        }

        .status.past {
          background: #f3f4f6;
          color: #6b7280;
        }

        .project-pill-description {
          color: #6b7280;
          font-size: 13px;
          line-height: 1.4;
          margin-bottom: 8px;
          flex: 1;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          word-wrap: break-word;
        }

        .project-pill-dates {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 8px;
        }

        .date-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #6B6654;
        }

        .announcement-pill-dates {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 12px;
          padding-top: 8px;
          border-top: 1px solid #EBE5C2;
        }

        .project-pill-meta {
          display: flex;
          gap: 16px;
          font-size: 12px;
          color: #9ca3af;
        }

        .file-types,
        .phases-count {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .empty-projects-list {
          text-align: center;
          padding: 60px 20px;
          color: #9ca3af;
        }

        .empty-projects-list svg {
          margin-bottom: 16px;
        }

        .empty-projects-list p {
          margin: 0 0 16px 0;
          font-size: 16px;
        }

        .project-details-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: white;
          width: calc(100% - 450px);
          min-width: 0;
        }

        .project-details-content {
          flex: 1;
          padding: 24px;
          overflow-y: auto;
          max-height: 80vh;
        }

        .project-header-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .project-title-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .project-title-section h2 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }

        .project-status-badge .status-badge {
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .project-status-badge .status-badge.current {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .project-status-badge .status-badge.past {
          background: rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .project-timeline-summary {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .project-timeline-summary .timeline-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(255, 255, 255, 0.9);
          font-size: 14px;
        }

        .project-description-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 24px;
        }

        .project-description-section h4 {
          margin: 0 0 12px 0;
          color: #1f2937;
          font-size: 18px;
          font-weight: 600;
        }

        .project-description-text {
          color: #6b7280;
          font-size: 16px;
          line-height: 1.6;
          margin: 0;
        }

        .project-settings-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 24px;
        }

        .settings-card {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .settings-card h4 {
          margin: 0 0 16px 0;
          color: #1f2937;
          font-size: 16px;
          font-weight: 600;
          border-bottom: 2px solid #e1e5e9;
          padding-bottom: 8px;
        }

        .setting-item {
          margin-bottom: 12px;
        }

        .setting-item label {
          display: block;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }

        .setting-value {
          color: #6b7280;
          font-size: 14px;
        }

        .project-phases-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          margin-bottom: 24px;
        }

        .section-header {
          margin-bottom: 20px;
        }

        .section-header h3,
        .section-header h4 {
          margin: 0;
          color: #504B38;
          font-size: 18px;
          font-weight: 600;
          border-bottom: 2px solid #EBE5C2;
          padding-bottom: 8px;
        }

        /* Old comments-header style - removed, using section-title now */

        .phases-dropdowns {
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .phase-dropdown {
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          overflow: visible;
          position: relative;
          z-index: 1;
          margin-bottom: 12px;
          transition: transform 0.3s ease;
        }

        .phase-dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .phase-dropdown-header:hover {
          background: #f9fafb;
        }

        .phase-dropdown-content {
          padding: 20px;
          border-top: 1px solid #e5e7eb;
          background: rgb(255, 255, 255);
          max-height: none;
          overflow: auto;
          min-height: 300px;
        }

        .dropdown-toggle {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .dropdown-toggle:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .phase-title-section h5 {
          margin: 0 0 4px 0;
          color: #1f2937;
          font-size: 16px;
          font-weight: 600;
        }

        .phase-name {
          color: #6b7280;
          font-size: 14px;
        }

        .phase-status-badge .status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .phase-status-badge .status.upcoming {
          background: #fef3c7;
          color: #92400e;
        }

        .phase-status-badge .status.active {
          background: #d1fae5;
          color: #065f46;
        }

        .phase-status-badge .status.completed {
          background: #e5e7eb;
          color: #374151;
        }

        .phase-timeline {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px;
          background: white;
          border-radius: 8px;
        }

        .phase-timeline .timeline-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
          font-size: 13px;
        }

        .phase-description,
        .phase-file-types,
        .phase-evaluation,
        .phase-rubric,
        .phase-attempts {
          margin-bottom: 16px;
        }

        .phase-description label,
        .phase-file-types label,
        .phase-evaluation label,
        .phase-rubric label,
        .phase-attempts label {
          display: block;
          font-size: 13px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }

        .phase-description p {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
          padding: 8px;
          background: white;
          border-radius: 6px;
        }

        .file-types-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .file-type-tag {
          background: #dbeafe;
          color: #1e40af;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .evaluation-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .evaluation-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }

        .evaluation-badge.builtin {
          background: #dbeafe;
          color: #1e40af;
        }

        .evaluation-badge.custom {
          background: #f3e8ff;
          color: #7c3aed;
        }

        .file-link {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #3b82f6;
          text-decoration: none;
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .file-link:hover {
          background: #eff6ff;
          text-decoration: underline;
        }

        .rubric-content {
          padding: 8px;
          background: white;
          border-radius: 6px;
        }

        .rubric-content p {
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
          margin: 0 0 8px 0;
        }

        .phase-attempts {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .attempts-value {
          background: white;
          color: #374151;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 13px;
        }

        .no-project-selected {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #9ca3af;
          padding: 60px 20px;
        }

        .no-project-selected svg {
          margin-bottom: 24px;
        }

        .no-project-selected h3 {
          margin: 0 0 12px 0;
          color: #6b7280;
          font-size: 24px;
        }

        .no-project-selected p {
          margin: 0;
          font-size: 16px;
          line-height: 1.5;
        }

        .project-management-tools-header {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
        }

        .project-management-tools-header .btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          text-decoration: none;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }

        .project-management-tools-header .btn-outline {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .project-management-tools-header .btn-outline:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .project-management-tools-header .btn-danger {
          background: rgba(239, 68, 68, 0.8);
          color: white;
          border: 1px solid rgba(239, 68, 68, 0.9);
        }

        .project-management-tools-header .btn-danger:hover {
          background: rgba(220, 38, 38, 0.9);
          border-color: rgba(220, 38, 38, 1);
        }

        /* Announcements Section Styles */
        .announcements-content-redesigned {
          padding: 2rem;
          width: 100%;
          max-width: 100%;
        }

        /* Create Announcement Button */
        .create-announcement-button-container {
          margin-bottom: 2rem;
          display: flex;
          justify-content: center;
        }

        .btn-create-announcement {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 2rem;
          background: linear-gradient(135deg, #B9B28A 0%, #A39F7A 100%);
          color: white;
          border: 2px solid #EBE5C2;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .btn-create-announcement:hover {
          background: linear-gradient(135deg, #A39F7A 0%, #B9B28A 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .announcements-main-container {
          display: flex !important;
          height: calc(100vh - 320px) !important;
          min-height: 600px !important;
          width: 100% !important;
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }

        .announcements-list-panel {
          width: 450px !important;
          min-width: 450px !important;
          max-width: 450px !important;
          border-right: 2px solid #EBE5C2;
          display: flex;
          flex-direction: column;
          background: #F8F3D9;
        }

        .announcements-list-scroll {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
        }

        .announcements-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .announcement-pill {
          background: white;
          border: 2px solid #EBE5C2;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s;
          position: relative;
        }

        .announcement-pill:hover {
          border-color: #B9B28A;
          box-shadow: 0 2px 8px rgba(185, 178, 138, 0.2);
          transform: translateY(-2px);
        }

        .announcement-pill.selected {
          border-color: #B9B28A;
          background: #FFFEF9;
          box-shadow: 0 4px 12px rgba(185, 178, 138, 0.3);
        }

        .announcement-pill-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .announcement-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #504B38;
          line-height: 1.4;
          flex: 1;
        }

        .announcement-status-badge {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
        }

        .announcement-pill-description {
          color: #6B6654;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .announcement-pill-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          color: #6B6654;
        }

        .announcement-type,
        .announcement-author {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6B6654;
        }

        .announcement-type svg,
        .announcement-author svg {
          color: #B9B28A;
        }

        .announcement-details-panel {
          flex: 1 !important;
          background: white !important;
          overflow-y: auto !important;
          width: calc(100% - 450px);
          min-width: 0;
        }

        .announcement-details {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .announcement-details-header {
          border-bottom: 2px solid #EBE5C2;
          padding-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .announcement-details-actions {
          display: flex;
          gap: 10px;
        }

        .announcement-details-actions .btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .announcement-details-actions .btn-outline {
          background: white;
          color: #504B38;
          border: 2px solid #EBE5C2;
        }

        .announcement-details-actions .btn-outline:hover {
          background: #F8F3D9;
          border-color: #B9B28A;
          transform: translateY(-2px);
        }

        .announcement-details-actions .btn-danger {
          background: #FEE2E2;
          color: #991B1B;
          border: 2px solid #FCA5A5;
        }

        .announcement-details-actions .btn-danger:hover {
          background: #FCA5A5;
          color: white;
          border-color: #991B1B;
          transform: translateY(-2px);
        }

        .announcement-details-title-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .announcement-details-title-row h2 {
          margin: 0;
          color: #504B38;
          font-size: 24px;
          font-weight: 600;
          line-height: 1.3;
          font-family: Georgia, 'Times New Roman', serif;
        }

        /* New Metadata Bar - Compact single row */
        .announcement-metadata-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: #F8F3D9;
          border: 2px solid #EBE5C2;
          border-radius: 8px;
          flex-wrap: wrap;
          font-size: 14px;
          color: #6B6654;
        }

        .metadata-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .metadata-item svg {
          color: #B9B28A;
          flex-shrink: 0;
        }

        .metadata-separator {
          color: #B9B28A;
          font-weight: bold;
        }

        /* Section Titles - Unified style for Attachments and Comments */
        .section-title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0 0 16px 0;
          color: #504B38;
          font-size: 18px;
          font-weight: 600;
          padding-bottom: 10px;
          border-bottom: 2px solid #EBE5C2;
        }

        .section-title svg {
          color: #B9B28A;
        }

        /* Remove old info cards styles - no longer needed */
        .announcement-info-cards {
          display: none;
        }

        .info-card {
          background: #F8F3D9;
          border: 2px solid #EBE5C2;
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s ease;
        }

        .info-card:hover {
          background: #FFFEF9;
          border-color: #B9B28A;
          transform: translateY(-2px);
        }

        .info-card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          color: #6B6654;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .info-card-content {
          color: #504B38;
          font-size: 14px;
          font-weight: 500;
        }

        .announcement-content-section {
          background: white;
          border: 2px solid #EBE5C2;
          border-radius: 12px;
          padding: 20px;
          max-height: 400px;
          overflow-y: auto;
        }

        .content-text {
          color: #504B38;
          font-size: 16px;
          line-height: 1.6;
          white-space: pre-wrap;
        }

        .announcement-files-section {
          margin-top: 24px;
        }

        .announcement-comments-section {
          margin-top: 24px;
        }

        .files-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 16px;
          margin-top: 16px;
        }

        .file-card {
          background: #F8F3D9;
          border: 2px solid #EBE5C2;
          border-radius: 12px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          transition: all 0.2s ease;
          position: relative;
        }

        .file-card:hover {
          background: #FFFEF9;
          border-color: #B9B28A;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(185, 178, 138, 0.2);
        }

        .file-name {
          font-size: 14px;
          font-weight: 500;
          color: #504B38;
          margin-bottom: 4px;
          word-break: break-word;
        }

        .file-size {
          font-size: 12px;
          color: #6B6654;
        }

        .no-announcement-selected {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 40px;
        }

        .no-announcement-content {
          text-align: center;
          color: #6B6654;
        }

        .no-announcement-content svg {
          color: #B9B28A;
          margin-bottom: 1rem;
        }

        .no-announcement-content h3 {
          margin: 16px 0 8px 0;
          color: #504B38;
          font-size: 20px;
          font-weight: 600;
        }

        .no-announcement-content p {
          color: #6B6654;
        }

        .no-announcements {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          color: #6B6654;
        }

        .no-announcements svg {
          color: #B9B28A;
          margin-bottom: 1rem;
        }

        .no-announcements h3 {
          color: #504B38;
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }

        .no-announcements p {
          color: #6B6654;
        }

        .status.important {
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FBBF24;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .status.recent {
          background: #DBEAFE;
          color: #1E40AF;
          border: 1px solid #3B82F6;
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        /* ===== JOIN REQUESTS SECTION - MATCH STUDENTS STYLE ===== */
        .join-requests-content-redesigned {
          padding: 2rem;
          width: 100%;
          max-width: 100%;
        }

        .join-requests-main-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          padding: 2rem;
          margin-top: 2rem;
        }

        .requests-section-redesigned {
          margin-bottom: 2rem;
        }

        .requests-section-redesigned:last-child {
          margin-bottom: 0;
        }

        .section-header-redesigned {
          margin-bottom: 1.5rem;
        }

        .section-header-redesigned h3 {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 0;
          padding-bottom: 12px;
          color: #504B38;
          font-size: 1.25rem;
          font-weight: 600;
          border-bottom: 2px solid #EBE5C2;
          font-family: Georgia, 'Times New Roman', serif;
        }

        .section-header-redesigned h3 svg {
          color: #B9B28A;
        }

        /* Pending Requests Grid */
        .requests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .request-card {
          background: white;
          border: 2px solid #EBE5C2;
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .request-card:hover {
          border-color: #B9B28A;
          box-shadow: 0 4px 12px rgba(185, 178, 138, 0.2);
          transform: translateY(-2px);
        }

        .request-card.pending {
          background: linear-gradient(135deg, #FFFEF9 0%, #F8F3D9 100%);
        }

        .request-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 1rem;
          padding-bottom: 1rem;
          border-bottom: 2px solid #EBE5C2;
        }

        .student-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: linear-gradient(135deg, #B9B28A 0%, #A39F7A 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .student-info {
          flex: 1;
        }

        .student-info h4 {
          margin: 0 0 4px 0;
          color: #504B38;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .student-info .student-id {
          margin: 0;
          color: #6B6654;
          font-size: 0.875rem;
        }

        .status-badge-pending {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #FEF3C7;
          color: #92400E;
          border: 1px solid #FBBF24;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
        }

        .request-card-body {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 1rem;
        }

        .request-detail-row {
          display: flex;
          align-items: center;
          gap: 10px;
          color: #6B6654;
          font-size: 0.875rem;
        }

        .request-detail-row svg {
          color: #B9B28A;
          flex-shrink: 0;
        }

        .request-card-actions {
          display: flex;
          gap: 10px;
        }

        .btn-request {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-request.approve {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: white;
        }

        .btn-request.approve:hover {
          background: linear-gradient(135deg, #059669 0%, #10B981 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-request.reject {
          background: #FEE2E2;
          color: #991B1B;
          border: 2px solid #FCA5A5;
        }

        .btn-request.reject:hover {
          background: #FCA5A5;
          color: white;
          border-color: #991B1B;
          transform: translateY(-2px);
        }

        /* Recent Decisions List */
        .requests-list-compact {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .request-item-compact {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border: 2px solid #EBE5C2;
          border-radius: 12px;
          transition: all 0.2s ease;
        }

        .request-item-compact:hover {
          border-color: #B9B28A;
          transform: translateX(4px);
          box-shadow: 0 2px 8px rgba(185, 178, 138, 0.15);
        }

        .request-item-compact.approved {
          background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%);
        }

        .request-item-compact.rejected {
          background: linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%);
        }

        .compact-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: #EBE5C2;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6B6654;
          flex-shrink: 0;
        }

        .compact-info {
          flex: 1;
        }

        .compact-info h5 {
          margin: 0 0 4px 0;
          color: #504B38;
          font-size: 0.95rem;
          font-weight: 600;
        }

        .compact-info p {
          margin: 0;
          color: #6B6654;
          font-size: 0.875rem;
        }

        .compact-meta {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-badge-compact {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status-badge-compact.approved {
          background: #D1FAE5;
          color: #065F46;
        }

        .status-badge-compact.rejected {
          background: #FEE2E2;
          color: #991B1B;
        }

        .compact-date {
          color: #6B6654;
          font-size: 0.875rem;
        }

        /* Empty State */
        .empty-state-redesigned {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
        }

        .empty-state-redesigned svg {
          color: #B9B28A;
          margin-bottom: 1.5rem;
        }

        .empty-state-redesigned h3 {
          color: #504B38;
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          font-family: Georgia, 'Times New Roman', serif;
        }

        .empty-state-redesigned p {
          color: #6B6654;
          font-size: 1rem;
        }

        /* Responsive Design */
        @media (max-width: 1200px) {
          .projects-content-redesigned,
          .announcements-content-redesigned {
            min-width: auto;
          }
          
          .projects-main-container,
          .announcements-main-container {
            flex-direction: column;
            height: auto;
          }
          
          .projects-list-panel,
          .announcements-list-panel {
            width: 100%;
            min-width: auto;
            max-width: none;
            height: 400px;
          }
          
          .project-details-panel,
          .announcement-details-panel {
            width: 100%;
            height: auto;
          }

          .requests-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Ultra-Specific Sidebar Styling - Professor Dashboard */}
      <style>{`
        /* Force professor sidebar colors with !important */
        .professor-dashboard-sidebar-ultra-unique-v2024 {
          background-color: #09122C !important;
          border-right: 2px solid #872341 !important;
        }

        .professor-dashboard-sidebar-ultra-unique-v2024 [data-slot="sidebar-header"] {
          background-color: #09122C !important;
          border-bottom: 2px solid #872341 !important;
        }

        .professor-dashboard-sidebar-ultra-unique-v2024 [data-slot="sidebar-content"] {
          background-color: #09122C !important;
        }

        .professor-dashboard-sidebar-ultra-unique-v2024 [data-slot="sidebar-footer"] {
          background-color: #09122C !important;
          border-top: 2px solid #872341 !important;
        }

        /* Navigation items */
        .professor-dashboard-sidebar-ultra-unique-v2024 [class*="nav-main"] {
          background-color: #09122C !important;
        }

        .professor-dashboard-sidebar-ultra-unique-v2024 [class*="nav-main"] a {
          color: #FFFFFF !important;
        }

        .professor-dashboard-sidebar-ultra-unique-v2024 [class*="nav-main"] a:hover {
          background-color: rgba(190, 49, 68, 0.15) !important;
          color: #FFFFFF !important;
        }

        /* Active nav items - burgundy background */
        .professor-dashboard-sidebar-ultra-unique-v2024 [class*="nav-main"] a[data-active="true"],
        .professor-dashboard-sidebar-ultra-unique-v2024 [class*="nav-main"] a.active {
          background-color: rgba(190, 49, 68, 0.2) !important;
          border-left: 3px solid #BE3144 !important;
          color: #BE3144 !important;
        }

        /* Sidebar menu items */
        .professor-dashboard-sidebar-ultra-unique-v2024 [class*="sidebar-menu"] {
          background-color: #09122C !important;
        }

        .professor-dashboard-sidebar-ultra-unique-v2024 [class*="sidebar-menu"] [class*="menu-button"] {
          background-color: #09122C !important;
          color: #FFFFFF !important;
        }

        .professor-dashboard-sidebar-ultra-unique-v2024 [class*="sidebar-menu"] [class*="menu-button"]:hover {
          background-color: rgba(190, 49, 68, 0.15) !important;
        }

        /* Remove beige background from sidebar toggle button */
        .sidebar-trigger-professor-unique {
          background-color: transparent !important;
          color: #ffffff !important;
          border: none !important;
        }

        .sidebar-trigger-professor-unique:hover {
          background-color: rgba(190, 49, 68, 0.2) !important;
          color: #ffffff !important;
        }

        /* Notch container styling - no pseudo-elements needed */
        .grade-submissions-notch-container {
          position: relative !important;
        }

        /* Force Separator component to use burgundy color instead of beige */
        div[data-orientation="vertical"].bg-border {
          background-color: #872341 !important;
        }

        .shrink-0.bg-border {
          background-color: #872341 !important;
        }

        .shrink-0.bg-border[data-orientation="vertical"] {
          background-color: #872341 !important;
        }
        /* Remove beige background from header title */
        .professor-header-title-unique {
          background-color: transparent !important;
          color: #ffffff !important;
        }

        /* Ensure site header has correct colors */
        header {
          background-color: #872341 !important;
          border-bottom-color: #872341 !important;
          border-right: 2px solid #872341 !important;
        }

        header h1,
        header .site-header-title {
          background-color: transparent !important;
          color: #ffffff !important;
        }

        /* Override any hover effects on header elements */
        header button {
          background-color: transparent !important;
          color: #ffffff !important;
        }

        header button:hover {
          background-color: rgba(190, 49, 68, 0.2) !important;
          color: #ffffff !important;
        }

        /* Remove beige background and fix SVG styling */
        .sidebar-trigger-professor-unique svg {
          color: #ffffff !important;
          fill: #ffffff !important;
          background-color: transparent !important;
        }

        .sidebar-trigger-professor-unique svg path {
          fill: #ffffff !important;
          background-color: transparent !important;
        }

        /* Remove beige right border from SidebarInset */
        [class*="sidebar-inset"],
        main[class*="flex"],
        .sidebar-inset {
          border-right: 2px solid #872341 !important;
          border-left: none !important;
        }

        /* ===== PROJECTS AND GROUPS CARDS GLASSMORPHISM ===== */
        .projects-main-card-landing,
        .groups-main-card-landing {
          background: rgba(9, 18, 44, 0.15) !important;
          backdropFilter: blur(3.2px) saturate(120%) !important;
          WebkitBackdropFilter: blur(3.2px) saturate(120%) !important;
          border: 0.1px solid rgb(95, 95, 95) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08) !important;
        }

        .projects-list-panel-landing,
        .groups-list-panel-landing {
          background: rgba(9, 18, 44, 0.2) !important;
          border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .projects-list-header-landing,
        .groups-list-header-landing {
          border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .projects-list-header-landing h4,
        .groups-list-header-landing h4 {
          color: #FFFFFF !important;
        }

        .filter-tab-landing,
        .project-item-landing,
        .group-item-landing {
          background: rgba(135, 35, 65, 0.15) !important;
          border: 0.1px solid rgba(255, 255, 255, 0.2) !important;
          color: #FFFFFF !important;
        }

        .filter-tab-landing:hover,
        .project-item-landing:hover,
        .group-item-landing:hover {
          background: rgba(135, 35, 65, 0.25) !important;
          border: 0.1px solid rgba(135, 35, 65, 0.5) !important;
        }

        .filter-tab-landing.active {
          background: linear-gradient(135deg, #872341 0%, #BE3144 100%) !important;
          border: 0.1px solid #BE3144 !important;
        }

        .project-details-panel-landing,
        .group-details-panel-landing {
          background: rgba(9, 18, 44, 0.1) !important;
        }

        .project-details-panel-landing h3,
        .group-details-panel-landing h3,
        .project-title-landing,
        .group-title-landing {
          color: #FFFFFF !important;
        }

        .project-info-item-landing,
        .group-info-item-landing {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .project-info-label-landing,
        .group-info-label-landing {
          color: rgba(255, 255, 255, 0.7) !important;
        }

        /* ===== GRADING SECTION GLASSMORPHISM ===== */
        .grading-card,
        .submission-card,
        .submission-details-card {
          background: rgba(9, 18, 44, 0.15) !important;
          backdropFilter: blur(3.2px) saturate(120%) !important;
          WebkitBackdropFilter: blur(3.2px) saturate(120%) !important;
          border: 0.1px solid rgb(95, 95, 95) !important;
          color: #FFFFFF !important;
        }

        .grading-card:hover,
        .submission-card:hover {
          background: rgba(9, 18, 44, 0.25) !important;
        }

        .grading-card h3,
        .submission-card h4,
        .grading-header {
          color: #FFFFFF !important;
        }

        .grading-card p,
        .submission-card p {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        /* Modal Styling */
        .modal-overlay {
          background: rgba(9, 18, 44, 0.95) !important;
        }

        .modal-content,
        .project-modal-content,
        .group-modal-content {
          background: rgba(9, 18, 44, 0.15) !important;
          backdropFilter: blur(3.2px) saturate(120%) !important;
          WebkitBackdropFilter: blur(3.2px) saturate(120%) !important;
          border: 0.1px solid rgb(95, 95, 95) !important;
          color: #FFFFFF !important;
        }

        .modal-content h2,
        .modal-content h3,
        .project-modal-content h2,
        .group-modal-content h2 {
          color: #FFFFFF !important;
        }

        .modal-content p,
        .modal-content span,
        .project-modal-content p,
        .group-modal-content p {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        /* Button Styling for Glassmorphism Context */
        .btn-outline-landing {
          background: rgba(9, 18, 44, 0.15) !important;
          color: #FFFFFF !important;
          border: 0.1px solid rgba(255, 255, 255, 0.3) !important;
        }

        .btn-outline-landing:hover {
          background: rgba(135, 35, 65, 0.25) !important;
          border: 0.1px solid rgba(135, 35, 65, 0.5) !important;
          box-shadow: 0 4px 12px rgba(135, 35, 65, 0.2) !important;
        }

        /* Input and Form Elements */
        input[type="text"],
        input[type="email"],
        input[type="date"],
        select,
        textarea {
          background: rgba(9, 18, 44, 0.15) !important;
          color: #FFFFFF !important;
          border: 0.1px solid rgba(255, 255, 255, 0.2) !important;
        }

        input[type="text"]::placeholder,
        input[type="email"]::placeholder,
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.5) !important;
        }

        input[type="text"]:focus,
        input[type="email"]:focus,
        input[type="date"]:focus,
        select:focus,
        textarea:focus {
          background: rgba(9, 18, 44, 0.25) !important;
          border: 0.1px solid rgba(135, 35, 65, 0.5) !important;
          outline: none !important;
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.2) !important;
        }

        /* Badge Styling */
        .badge-landing {
          background: rgba(135, 35, 65, 0.3) !important;
          color: #FFFFFF !important;
        }

        /* Text Updates for Contrast */
        .landing-page-text,
        .detail-item-landing label,
        .detail-item-landing span,
        .perf-item-landing label,
        .perf-item-landing span {
          color: #FFFFFF !important;
        }

        /* Exception for SimplifiedGroupCreator search and sort inputs */
        input.group-creator-search-input-unique[type="text"] {
          background: white !important;
          color: rgb(40, 40, 40) !important;
          border: 2px solid rgb(135, 35, 65) !important;
          border-radius: 8px !important;
          padding: 10px 16px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 2px 4px rgba(135, 35, 65, 0.1) !important;
        }

        input.group-creator-search-input-unique[type="text"]::placeholder {
          color: rgba(40, 40, 40, 0.5) !important;
          font-weight: 400 !important;
        }

        input.group-creator-search-input-unique[type="text"]:hover {
          border-color: rgb(105, 25, 50) !important;
          box-shadow: 0 3px 8px rgba(135, 35, 65, 0.15) !important;
        }

        input.group-creator-search-input-unique[type="text"]:focus {
          background: white !important;
          border: 2px solid rgb(105, 25, 50) !important;
          box-shadow: 0 0 0 4px rgba(135, 35, 65, 0.15) !important;
          outline: none !important;
        }

        select.group-creator-sort-select-unique {
          background: white !important;
          color: rgb(40, 40, 40) !important;
          border: 2px solid rgb(135, 35, 65) !important;
          border-radius: 8px !important;
          padding: 10px 16px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          transition: all 0.3s ease !important;
          box-shadow: 0 2px 4px rgba(135, 35, 65, 0.1) !important;
          cursor: pointer !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          -moz-appearance: none !important;
        }

        select.group-creator-sort-select-unique:hover {
          border-color: rgb(105, 25, 50) !important;
          box-shadow: 0 3px 8px rgba(135, 35, 65, 0.15) !important;
        }

        select.group-creator-sort-select-unique:focus {
          background: white !important;
          border: 2px solid rgb(105, 25, 50) !important;
          box-shadow: 0 0 0 4px rgba(135, 35, 65, 0.15) !important;
          outline: none !important;
        }

        select.group-creator-sort-select-unique option {
          background: white !important;
          color: rgb(40, 40, 40) !important;
          padding: 8px !important;
        }
      `}</style>

      {/* Edit Project Modal */}
      {showEditProjectModal && editingProject && (
        <EditProjectModal
          project={editingProject}
          onClose={handleCloseEditProjectModal}
          onUpdateProject={handleUpdateProject}
          onUpdatePhase={handleUpdatePhase}
        />
      )}

      {/* View Evaluation Modal */}
      {viewingEvaluationModal && (
        <div key={`modal-${viewingEvaluationModal.memberId}`} style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #F3F4F6'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1F2937' }}>
                {viewingEvaluationModal.memberName}'s Project Evaluation Submission
              </h2>
              <button
                onClick={() => setViewingEvaluationModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6B7280'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                Submitted On: {viewingEvaluationModal.submissionDate 
                  ? new Date(viewingEvaluationModal.submissionDate).toLocaleString()
                  : 'N/A'
                }
              </div>
            </div>

            {/* Fetch and Display the Evaluation Details */}
            {(() => {
              // Get all members in the group
              const allMembers = gradeSubmissionsView.selectedSubmission?.memberTasks || gradeSubmissionsView.selectedSubmission?.memberInclusions || [];
              
              // Find the member who submitted the evaluation
              const evaluatingMember = allMembers.find(m => m.member_id === viewingEvaluationModal.memberId);
              
              if (!evaluatingMember) {
                return <div style={{ color: '#6B7280', textAlign: 'center', padding: '24px' }}>Member not found</div>;
              }
              
              // Get this member's own evaluation submission
              const memberEvalSubmission = (gradeSubmissionsView.selectedSubmission?.evaluationSubmissions || []).find(
                e => e.member_id === viewingEvaluationModal.memberId
              );
              
              const hasSubmittedOwnEvaluation = memberEvalSubmission?.has_submitted_own_evaluations || 
                                                memberEvalSubmission?.project_evaluation?.has_submitted || false;

              if (!hasSubmittedOwnEvaluation) {
                return (
                  <div style={{ color: '#6B7280', textAlign: 'center', padding: '24px' }}>
                    This member did not submit a project evaluation
                  </div>
                );
              }

              // Get evaluations this member GAVE to others (from evaluations_received array where this member is the evaluator)
              const memberEvaluationsGiven = [];
              (gradeSubmissionsView.selectedSubmission?.evaluationSubmissions || []).forEach(memberEvalSub => {
                (memberEvalSub.evaluations_received || []).forEach(evalItem => {
                  if (evalItem.evaluator_id === viewingEvaluationModal.memberId) {
                    // Add the evaluated member info to the evaluation object
                    memberEvaluationsGiven.push({
                      ...evalItem,
                      evaluated_member_id: memberEvalSub.member_id,
                      evaluated_member_name: memberEvalSub.member_name || memberEvalSub.full_name
                    });
                  }
                });
              });
              
              // If member submitted but gave no evaluations, show message
              if (memberEvaluationsGiven.length === 0) {
                return (
                  <div style={{ color: '#6B7280', textAlign: 'center', padding: '24px' }}>
                    This member submitted their evaluation form but has not evaluated any groupmates yet.
                  </div>
                );
              }

              // Show evaluations given by this member to others
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#6B7280', fontWeight: '600' }}>
                    Members Evaluated: {memberEvaluationsGiven.length}
                  </div>
                  {memberEvaluationsGiven.map((evaluation, idx) => {
                    // The evaluation_form has the criteria and scores already
                    if (!evaluation.evaluation_form || !evaluation.evaluation_form.criteria) {
                      return (
                        <div key={idx} style={{
                          backgroundColor: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          padding: '16px',
                          color: '#6B7280',
                          textAlign: 'center'
                        }}>
                          No evaluation form data available
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={evaluation.evaluation_submission_id || idx}
                        style={{
                          backgroundColor: '#F9FAFB',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{
                          fontSize: '13px',
                          fontWeight: '600',
                          color: '#1F2937',
                          borderBottom: '1px solid #E5E7EB',
                          paddingBottom: '8px'
                        }}>
                          Evaluated Member: <span style={{ color: '#2563EB' }}>{evaluation.evaluated_member_name || 'Unknown Member'}</span>
                        </div>
                        
                        {/* Display the criteria and scores from evaluation_form */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {evaluation.evaluation_form.criteria.map((criterion, cIdx) => (
                            <div key={cIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                              <div style={{ flex: 1, fontSize: '12px', color: '#374151' }}>
                                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{criterion.name}</div>
                                <div style={{ fontSize: '11px', color: '#6B7280' }}>Max: {criterion.max_points}</div>
                              </div>
                              <div style={{
                                backgroundColor: criterion.score_received >= (criterion.max_points * 0.8) ? '#D1FAE5' : criterion.score_received >= (criterion.max_points * 0.6) ? '#FEF3C7' : '#FEE2E2',
                                color: criterion.score_received >= (criterion.max_points * 0.8) ? '#047857' : criterion.score_received >= (criterion.max_points * 0.6) ? '#B45309' : '#B91C1C',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}>
                                {criterion.score_received}/{criterion.max_points}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #E5E7EB' }}>
                          <div style={{ fontSize: '12px', fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                            Total Score: <span style={{ color: '#2563EB' }}>{evaluation.percentage}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}


            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid #E5E7EB'
            }}>
              <button
                onClick={() => setViewingEvaluationModal(null)}
                style={{
                  padding: '10px 24px',
                  backgroundColor: '#E5E7EB',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#D1D5DB'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#E5E7EB'}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Project Creation Modal */}
      {showProjectModal && (
        <SimplifiedProjectCreator 
          courseId={courseId}
          course={course}
          onClose={() => setShowProjectModal(false)}
          onProjectCreated={fetchCourseData}
        />
      )}

      {/* Warning Modal */}
      {showWarningModal && (
        <WarningModal
          message={warningMessage}
          onClose={() => {
            setShowWarningModal(false);
            setProjectToDelete(null);
          }}
          onConfirm={projectToDelete ? confirmDeleteProject : undefined}
          showConfirm={!!projectToDelete}
          confirmText="Delete Project"
          cancelText="Cancel"
        />
      )}

      {/* Rubric Modal */}
      {showRubricModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '2px solid #E5E7EB',
              paddingBottom: '16px'
            }}>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#2c3e50',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <FaFileAlt style={{ fontSize: '18px', color: '#34656D' }} />
                {gradeSubmissionsView.selectedSubmission?.type === 'phase' ? 'Phase Rubric' : 'Project Rubric'}
              </h2>
              <button
                onClick={() => {
                  setShowRubricModal(false);
                  setRubricContent(null);
                }}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  color: '#6B7280',
                  cursor: 'pointer',
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#F3F4F6';
                  e.target.style.color = '#2c3e50';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6B7280';
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              color: '#374151',
              fontSize: '14px',
              lineHeight: '1.6'
            }}>
              {rubricContent && rubricContent.type ? (
                // New rubricData structure with type and data
                rubricContent.type === 'builtin' ? (
                  // Display built-in rubric with criteria
                  <div>
                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#2c3e50' }}>
                        Instructions
                      </h3>
                      <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '13px' }}>
                        {rubricContent.data.instructions}
                      </p>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>
                        Total Points: {rubricContent.data.total_points}
                      </h3>
                    </div>

                    {(rubricContent.data.phase_rubric_criteria || rubricContent.data.project_rubric_criteria) && (rubricContent.data.phase_rubric_criteria || rubricContent.data.project_rubric_criteria).length > 0 ? (
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#2c3e50' }}>
                          Criteria
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {(rubricContent.data.phase_rubric_criteria || rubricContent.data.project_rubric_criteria).map((criterion, idx) => (
                            <div 
                              key={idx}
                              style={{
                                padding: '12px',
                                backgroundColor: '#F9FAFB',
                                border: '1px solid #E5E7EB',
                                borderRadius: '6px'
                              }}
                            >
                              <p style={{ margin: '0 0 6px 0', fontWeight: '600', fontSize: '13px' }}>
                                {criterion.name} ({criterion.max_points} pts)
                              </p>
                              <p style={{ margin: 0, fontSize: '12px', color: '#6B7280' }}>
                                {criterion.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : rubricContent.type === 'custom' ? (
                  // Display custom rubric file
                  <div>
                    <p style={{ marginBottom: '12px' }}>Custom Rubric File:</p>
                    <a 
                      href={rubricContent.data.file_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        color: '#0369A1',
                        textDecoration: 'underline',
                        cursor: 'pointer',
                        wordBreak: 'break-all',
                        fontSize: '13px'
                      }}
                      title={rubricContent.data.file_name}
                    >
                      {rubricContent.data.file_name}
                    </a>
                  </div>
                ) : null
              ) : typeof rubricContent === 'string' ? (
                // If rubric is a string (URL or JSON string), try to display it
                (() => {
                  try {
                    const parsed = typeof rubricContent === 'string' && rubricContent.startsWith('{') 
                      ? JSON.parse(rubricContent) 
                      : null;
                    
                    if (parsed && typeof parsed === 'object') {
                      // Display parsed JSON
                      return (
                        <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '12px' }}>
                          {JSON.stringify(parsed, null, 2)}
                        </div>
                      );
                    } else if (rubricContent.startsWith('http')) {
                      // If it's a URL, display as link
                      return (
                        <div>
                          <p>Rubric File:</p>
                          <a 
                            href={rubricContent} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              color: '#0369A1',
                              textDecoration: 'underline',
                              cursor: 'pointer',
                              wordBreak: 'break-all'
                            }}
                          >
                            {rubricContent}
                          </a>
                        </div>
                      );
                    } else {
                      // Display as plain text
                      return <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{rubricContent}</div>;
                    }
                  } catch (e) {
                    return <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{rubricContent}</div>;
                  }
                })()
              ) : rubricContent && typeof rubricContent === 'object' ? (
                // Display object as formatted JSON
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'monospace', fontSize: '12px' }}>
                  {JSON.stringify(rubricContent, null, 2)}
                </div>
              ) : (
                <p style={{ color: '#9CA3AF', textAlign: 'center' }}>No rubric content available</p>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              borderTop: '1px solid #E5E7EB',
              paddingTop: '16px',
              gap: '12px'
            }}>
              <button
                onClick={() => {
                  setShowRubricModal(false);
                  setRubricContent(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#E5E7EB',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#374151',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#D1D5DB';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#E5E7EB';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reports Modal */}
      {showReportsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }} onClick={() => setShowReportsModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            maxWidth: '1200px',
            width: '95%',
            maxHeight: '90vh',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '2px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f9fafb'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#1f2937' }}>
                   Group Report
                </h2>
                {reportsModalGroupData && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                    {reportsModalGroupData.name} - {reportsModalPhase?.name || 'Phase'} - {reportsModalProject?.title || 'Project'}
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowReportsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{
              padding: '24px',
              flex: 1,
              overflowY: 'auto'
            }}>
              {reportsModalGroupData ? (
                <div>
                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>
                      Group Information
                    </h3>
                    <div style={{
                      backgroundColor: '#f3f4f6',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                            Group Name
                          </label>
                          <p style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
                            {reportsModalGroupData.name}
                          </p>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                            Member Count
                          </label>
                          <p style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
                            {reportsModalGroupData.members?.length || 0} members
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>
                      Group Members
                    </h3>
                    <div style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      overflow: 'hidden'
                    }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '13px'
                      }}>
                        <thead style={{ backgroundColor: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                          <tr>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Name</th>
                            <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportsModalGroupData.members && reportsModalGroupData.members.length > 0 ? (
                            reportsModalGroupData.members.map((member, index) => (
                              <tr key={index} style={{ 
                                borderBottom: index < reportsModalGroupData.members.length - 1 ? '1px solid #e5e7eb' : 'none',
                                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f9fafb'
                              }}>
                                <td style={{ padding: '12px' }}>
                                  {member.first_name} {member.last_name}
                                </td>
                                <td style={{ padding: '12px' }}>
                                  {member.email}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="2" style={{ padding: '16px', textAlign: 'center', color: '#9ca3af' }}>
                                No members found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>
                      Submission Details
                    </h3>
                    <div style={{
                      backgroundColor: '#f3f4f6',
                      padding: '16px',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                            Project
                          </label>
                          <p style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
                            {reportsModalProject?.title || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                            Phase
                          </label>
                          <p style={{ margin: 0, fontSize: '14px', color: '#1f2937' }}>
                            {reportsModalPhase?.name || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Task Statistics Section */}
                  {gradeSubmissionsView.selectedSubmission && (
                    <>
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>
                          Task Completion Overview
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                          {(() => {
                            const submission = gradeSubmissionsView.selectedSubmission;
                            let totalTasks = 0;
                            let submittedTasks = 0;
                            let approvedTasks = 0;
                            let revisionTasks = 0;
                            let pendingTasks = 0;

                            // Count tasks from memberTasks
                            if (submission.memberTasks && Array.isArray(submission.memberTasks)) {
                              submission.memberTasks.forEach(memberTask => {
                                if (memberTask.tasks && Array.isArray(memberTask.tasks)) {
                                  memberTask.tasks.forEach(task => {
                                    totalTasks++;
                                    const latestStatus = task.submission_files?.[task.submission_files.length - 1]?.status;
                                    
                                    if (latestStatus === 'approved') {
                                      approvedTasks++;
                                      submittedTasks++;
                                    } else if (latestStatus === 'revision_requested') {
                                      revisionTasks++;
                                      submittedTasks++;
                                    } else if (latestStatus === 'submitted' || latestStatus === 'pending') {
                                      pendingTasks++;
                                      submittedTasks++;
                                    } else if (task.submission_files && task.submission_files.length > 0) {
                                      submittedTasks++;
                                    }
                                  });
                                }
                              });
                            }

                            const missedTasks = totalTasks - submittedTasks;

                            return (
                              <>
                                <div style={{
                                  backgroundColor: '#DBEAFE',
                                  border: '1px solid #60A5FA',
                                  borderRadius: '8px',
                                  padding: '16px',
                                  textAlign: 'center'
                                }}>
                                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#1E40AF', marginBottom: '4px' }}>
                                    {totalTasks}
                                  </div>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#1E40AF' }}>
                                    Total Tasks
                                  </div>
                                </div>
                                <div style={{
                                  backgroundColor: '#D1FAE5',
                                  border: '1px solid #34D399',
                                  borderRadius: '8px',
                                  padding: '16px',
                                  textAlign: 'center'
                                }}>
                                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#065F46', marginBottom: '4px' }}>
                                    {approvedTasks}
                                  </div>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#065F46' }}>
                                    Approved
                                  </div>
                                </div>
                                <div style={{
                                  backgroundColor: '#FEF3C7',
                                  border: '1px solid #FCD34D',
                                  borderRadius: '8px',
                                  padding: '16px',
                                  textAlign: 'center'
                                }}>
                                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#92400E', marginBottom: '4px' }}>
                                    {revisionTasks}
                                  </div>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#92400E' }}>
                                    Needs Revision
                                  </div>
                                </div>
                                <div style={{
                                  backgroundColor: '#FEE2E2',
                                  border: '1px solid #F87171',
                                  borderRadius: '8px',
                                  padding: '16px',
                                  textAlign: 'center'
                                }}>
                                  <div style={{ fontSize: '28px', fontWeight: '700', color: '#991B1B', marginBottom: '4px' }}>
                                    {missedTasks}
                                  </div>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#991B1B' }}>
                                    Not Submitted
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Pie Chart for Task Status */}
                        <div style={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '20px',
                          marginTop: '16px'
                        }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#1f2937', marginBottom: '16px', textAlign: 'center' }}>
                            Task Status Distribution
                          </h4>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={(() => {
                                  const submission = gradeSubmissionsView.selectedSubmission;
                                  let approved = 0, revision = 0, pending = 0, notSubmitted = 0;

                                  if (submission.memberTasks) {
                                    submission.memberTasks.forEach(memberTask => {
                                      if (memberTask.tasks) {
                                        memberTask.tasks.forEach(task => {
                                          const latestStatus = task.submission_files?.[task.submission_files.length - 1]?.status;
                                          if (latestStatus === 'approved') approved++;
                                          else if (latestStatus === 'revision_requested') revision++;
                                          else if (latestStatus === 'submitted' || latestStatus === 'pending') pending++;
                                          else notSubmitted++;
                                        });
                                      }
                                    });
                                  }

                                  return [
                                    { name: 'Approved', value: approved, color: '#10B981' },
                                    { name: 'Needs Revision', value: revision, color: '#F59E0B' },
                                    { name: 'Pending Review', value: pending, color: '#3B82F6' },
                                    { name: 'Not Submitted', value: notSubmitted, color: '#EF4444' }
                                  ].filter(item => item.value > 0);
                                })()}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {(() => {
                                  const submission = gradeSubmissionsView.selectedSubmission;
                                  let approved = 0, revision = 0, pending = 0, notSubmitted = 0;

                                  if (submission.memberTasks) {
                                    submission.memberTasks.forEach(memberTask => {
                                      if (memberTask.tasks) {
                                        memberTask.tasks.forEach(task => {
                                          const latestStatus = task.submission_files?.[task.submission_files.length - 1]?.status;
                                          if (latestStatus === 'approved') approved++;
                                          else if (latestStatus === 'revision_requested') revision++;
                                          else if (latestStatus === 'submitted' || latestStatus === 'pending') pending++;
                                          else notSubmitted++;
                                        });
                                      }
                                    });
                                  }

                                  return [
                                    { name: 'Approved', value: approved, color: '#10B981' },
                                    { name: 'Needs Revision', value: revision, color: '#F59E0B' },
                                    { name: 'Pending Review', value: pending, color: '#3B82F6' },
                                    { name: 'Not Submitted', value: notSubmitted, color: '#EF4444' }
                                  ].filter(item => item.value > 0).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ));
                                })()}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Member Performance Bar Chart */}
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>
                          Member Task Performance
                        </h3>
                        <div style={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '20px'
                        }}>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart
                              data={(() => {
                                const submission = gradeSubmissionsView.selectedSubmission;
                                if (!submission.memberTasks) return [];

                                return submission.memberTasks.map(memberTask => {
                                  let completed = 0, pending = 0, revision = 0;

                                  if (memberTask.tasks) {
                                    memberTask.tasks.forEach(task => {
                                      const latestStatus = task.submission_files?.[task.submission_files.length - 1]?.status;
                                      if (latestStatus === 'approved') completed++;
                                      else if (latestStatus === 'revision_requested') revision++;
                                      else if (task.submission_files && task.submission_files.length > 0) pending++;
                                    });
                                  }

                                  return {
                                    name: memberTask.member_name || 'Unknown',
                                    completed,
                                    pending,
                                    revision,
                                    total: memberTask.tasks?.length || 0
                                  };
                                });
                              })()}
                              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" style={{ fontSize: '12px' }} />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="completed" stackId="a" fill="#10B981" name="Approved" />
                              <Bar dataKey="pending" stackId="a" fill="#3B82F6" name="Pending" />
                              <Bar dataKey="revision" stackId="a" fill="#F59E0B" name="Revision" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Feedback Statistics */}
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>
                          Feedback & Evaluation Summary
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          {(() => {
                            const submission = gradeSubmissionsView.selectedSubmission;
                            let totalMembers = 0;
                            let membersWithFeedback = 0;
                            let membersEvaluated = 0;

                            if (submission.memberTasks) {
                              totalMembers = submission.memberTasks.length;
                              submission.memberTasks.forEach(member => {
                                if (member.individual_feedback && member.individual_feedback.trim()) {
                                  membersWithFeedback++;
                                }
                                if (member.individual_grade !== null && member.individual_grade !== undefined) {
                                  membersEvaluated++;
                                }
                              });
                            }

                            return (
                              <>
                                <div style={{
                                  backgroundColor: '#E0E7FF',
                                  border: '1px solid #818CF8',
                                  borderRadius: '8px',
                                  padding: '16px'
                                }}>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#3730A3', marginBottom: '8px' }}>
                                    Members with Feedback
                                  </div>
                                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#3730A3' }}>
                                    {membersWithFeedback} / {totalMembers}
                                  </div>
                                  <div style={{ 
                                    marginTop: '8px', 
                                    height: '6px', 
                                    backgroundColor: '#C7D2FE', 
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      height: '100%',
                                      width: `${totalMembers > 0 ? (membersWithFeedback / totalMembers) * 100 : 0}%`,
                                      backgroundColor: '#4F46E5',
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </div>
                                </div>
                                <div style={{
                                  backgroundColor: '#FCE7F3',
                                  border: '1px solid #F9A8D4',
                                  borderRadius: '8px',
                                  padding: '16px'
                                }}>
                                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#831843', marginBottom: '8px' }}>
                                    Members Graded
                                  </div>
                                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#831843' }}>
                                    {membersEvaluated} / {totalMembers}
                                  </div>
                                  <div style={{ 
                                    marginTop: '8px', 
                                    height: '6px', 
                                    backgroundColor: '#FBD5E9', 
                                    borderRadius: '3px',
                                    overflow: 'hidden'
                                  }}>
                                    <div style={{
                                      height: '100%',
                                      width: `${totalMembers > 0 ? (membersEvaluated / totalMembers) * 100 : 0}%`,
                                      backgroundColor: '#DB2777',
                                      transition: 'width 0.3s ease'
                                    }} />
                                  </div>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                  No report data available
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f9fafb',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={() => setShowReportsModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#e5e7eb',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#374151',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#d1d5db';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#e5e7eb';
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

export default CourseProfessorDashboard;

