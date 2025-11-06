import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, User, LogOut, Bell, Settings, Plus, Search, Users, Clock, 
  CheckCircle, XCircle, Edit, Eye, Copy, Calendar, 
  Menu, X, Home, BarChart3, FileText, ChevronRight, ChevronDown,
  TrendingUp, Activity, Star, Calendar as CalendarIcon,
  MessageSquare, AlertCircle, CheckCircle2, Clock3, Award, Target,
  Bookmark, GraduationCap, ClipboardList, UserCheck
} from 'lucide-react';
import { Squares } from './ui/squares-background';
import Aurora from './Aurora';

const ProfessorDashboard = () => {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    employeeNumber: '',
    college: ''
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [courseCreationMode, setCourseCreationMode] = useState('manual'); // 'manual' or 'preset'
  const navigate = useNavigate();

// Add program to the courseForm state
const [courseForm, setCourseForm] = useState({
  courseName: '',
  courseCode: '',
  section: '',
  semester: '1st Semester',
  schoolYear: '2024-2025',
  description: '',
  maxStudents: 50,
  program: 'BSIT'  // ✅ ADD program field with default
});

const [presetForm, setPresetForm] = useState({
  program: '',
  presetCourse: '',
  section: '',
  semester: '1st Semester',
  schoolYear: '2024-2025',
  maxStudents: 50
});

// Preset courses mapped by program
const presetCoursesByProgram = {
  'BSIT': [
    { id: 'fopr111', name: 'FOPR111 – Fundamentals of Programming w/ Lab', code: 'FOPR111' },
    { id: 'oopr211', name: 'OOPR211 – Object Oriented Programming I with Lab', code: 'OOPR211' },
    { id: 'oopr212', name: 'OOPR212 – Object Oriented Programming II with Lab', code: 'OOPR212' },
    { id: 'inpr111', name: 'INPR111 – Intermediate Programming w/ Lab', code: 'INPR111' },
    { id: 'iptc311', name: 'IPTC311 – Integrated Programming Technologies 1 with Lab', code: 'IPTC311' },
    { id: 'iptc312', name: 'IPTC312 – Integrated Programming Technologies with Lab', code: 'IPTC312' },
    { id: 'itcp311', name: 'ITCP311 – IT Capstone Project I', code: 'ITCP311' },
    { id: 'itcp312', name: 'ITCP312 – IT Capstone Project II', code: 'ITCP312' },
    { id: 'wbdv111', name: 'WBDV111 – Web Development w/ Lab', code: 'WBDV111' },
    { id: 'wbdv112', name: 'WBDV112 – Web Development II with Lab', code: 'WBDV112' },
    { id: 'adet211', name: 'ADET211 – Application Development and Emerging Technologies with Lab', code: 'ADET211' },
    { id: 'mads211', name: 'MADS211 – Multimedia and Design with Lab', code: 'MADS211' },
    { id: 'netw311', name: 'NETW311 – Networking I with Lab', code: 'NETW311' },
    { id: 'netw312', name: 'NETW312 – Networking II with Lab', code: 'NETW312' },
    { id: 'siaa311', name: 'SIAA311 – System Integration and Architecture I with Lab', code: 'SIAA311' },
    { id: 'siaa312', name: 'SIAA312 – System Integration and Architecture II with Lab', code: 'SIAA312' },
    { id: 'sadm411', name: 'SADM411 – System Admin and Maintenance with Lab', code: 'SADM411' },
    { id: 'itpm311', name: 'ITPM311 – IT Project Management', code: 'ITPM311' },
    { id: 'busm311', name: 'BUSM311 – Business Application Management', code: 'BUSM311' },
    { id: 'iaas311', name: 'IAAS311 – Information Assurance and Security 1 with Lab', code: 'IAAS311' },
    { id: 'iaas312', name: 'IAAS312 – Information Assurance and Security II with Lab', code: 'IAAS312' },
  ],
  'BSCS': [
    { id: 'cs110', name: 'CS110 - Computer Organization', code: 'CS110' },
    { id: 'cs120', name: 'CS120 - Operating Systems', code: 'CS120' },
    { id: 'cs210', name: 'CS210 - Computer Networks', code: 'CS210' },
    { id: 'cs220', name: 'CS220 - Cybersecurity Basics', code: 'CS220' },
    { id: 'cs310', name: 'CS310 - Advanced Algorithms', code: 'CS310' },
  ]
};


  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/signin');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'professor') {
      navigate('/dashboard');
      return;
    }

    setUser(parsedUser);
    fetchProfessorData();
  }, [navigate]);

  const fetchProfessorData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch professor profile data first
      const profileResponse = await fetch('/api/professor/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUser(prevUser => ({
          ...prevUser,
          ...profileData,
          profile_image_url: profileData.profile_image_url
        }));
      }
      
      // Fetch approved courses
      const coursesResponse = await fetch('/api/professor/courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (coursesResponse.ok) {
        const coursesData = await coursesResponse.json();
        setCourses(coursesData);
      }

      // Fetch pending courses
      const pendingResponse = await fetch('/api/professor/pending-courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (pendingResponse.ok) {
        const pendingData = await pendingResponse.json();
        setPendingCourses(pendingData);
      }

      // Fetch join requests
      const requestsResponse = await fetch('/api/professor/join-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setJoinRequests(requestsData);
      }
    } catch (error) {
      console.error('Error fetching professor data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      
      let courseData = courseForm;
      if (courseCreationMode === 'preset') {
        // Find the selected course from the preset
        const selectedCourse = presetCoursesByProgram[presetForm.program]?.find(
          c => c.id === presetForm.presetCourse
        );
        
        // Extract course name after the code and dash (handles both - and –)
        const namePart = selectedCourse?.name?.split(/\s[–-]\s/)[1] || '';
        
        courseData = {
          courseName: namePart,
          courseCode: selectedCourse?.code || '',
          program: presetForm.program,
          section: presetForm.section,
          semester: presetForm.semester,
          schoolYear: presetForm.schoolYear,
          maxStudents: presetForm.maxStudents,
          description: ''
        };
      }
      
      const response = await fetch('/api/professor/create-course', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(courseData)
      });

      if (response.ok) {
        alert('Course created successfully! Waiting for admin approval.');
        setShowCreateModal(false);
        setCourseCreationMode('manual');
        setCourseForm({
          courseName: '',
          courseCode: '',
          section: '',
          semester: '1st Semester',
          schoolYear: '2024-2025',
          description: '',
          maxStudents: 50,
          program: 'BSIT'  // ✅ ADD this line
        });
        setPresetForm({
          program: '',
          presetCourse: '',
          section: '',
          semester: '1st Semester',
          schoolYear: '2024-2025',
          maxStudents: 50
        });
        fetchProfessorData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course');
    }
  };

  const handleJoinRequestAction = async (requestId, action, reason = '') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/professor/join-request/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert(`Student request ${action}ed successfully!`);
        fetchProfessorData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error handling join request:', error);
      alert('Failed to process request');
    }
  };

  const copyJoinCode = (joinCode) => {
    navigator.clipboard.writeText(joinCode);
    
    // Create a toast notification instead of alert
    const toast = document.createElement('div');
    toast.textContent = '✓ Join code copied to clipboard!';
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      z-index: 10000;
      font-weight: 600;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(400px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(400px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        document.body.removeChild(toast);
        document.head.removeChild(style);
      }, 300);
    }, 2000);
  };

  const viewCourseStudents = async (course) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/professor/course/${course.id}/students`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const students = await response.json();
        setSelectedCourse({ ...course, students });
        setShowStudentsModal(true);
      }
    } catch (error) {
      console.error('Error fetching course students:', error);
      alert('Failed to load students');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleProfileEdit = () => {
    setProfileForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      employeeNumber: user?.employeeNumber || '',
      college: user?.college || ''
    });
    setShowProfileEdit(true);
    setShowProfileDropdown(false);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    
    try {
      const token = localStorage.getItem('token');
      // Only send firstName and lastName - other fields are read-only
      const response = await fetch('/api/professor/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName
        })
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setShowProfileEdit(false);
        setIsEditingProfile(false);
        alert('Profile updated successfully!');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const toggleProfileDropdown = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const getTotalStudents = () => {
    return courses.reduce((total, course) => total + course.current_student_count, 0);
  };

  const getPendingRequests = () => {
    return joinRequests.filter(req => req.status === 'pending').length;
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showProfileEdit || showCreateModal || showStudentsModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showProfileEdit, showCreateModal, showStudentsModal]);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="professor-dashboard">
      {/* Squares Background */}
      <div className="squares-background">
        <Squares 
          direction="diagonal"
          speed={0.25}
          squareSize={100}
          borderColor="rgba(225, 117, 100, 0.15)" 
          hoverFillColor="rgba(190, 49, 68, 0.1)"
          className="w-full h-full"
        />
      </div>

      {/* Top Navigation */}
      <nav className="top-nav">
        <div className="nav-container">
          {/* Left side - Logo and Navigation */}
          <div className="nav-left">
            <div className="logo">
              <img src="/S-MAN-LOGO-WHITE.png" alt="S-MAN Logo" className="logo-image" />
            </div>
            <div className="nav-links">
              <button 
                className={`nav-link ${activeSection === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveSection('overview')}
              >
                <Home size={18} />
                <span>Dashboard</span>
              </button>
              <button 
                className={`nav-link ${activeSection === 'courses' ? 'active' : ''}`}
                onClick={() => setActiveSection('courses')}
              >
                <BookOpen size={18} />
                <span>My Courses</span>
              </button>
              <button 
                className={`nav-link ${activeSection === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveSection('requests')}
              >
                <Bell size={18} />
                <span>Requests</span>
                {getPendingRequests() > 0 && (
                  <span className="notification-badge">{getPendingRequests()}</span>
                )}
              </button>
            </div>
          </div>

          {/* Right side - Profile and Actions */}
          <div className="nav-right">
            {/* Professor Profile Section */}
            <div id="professor-profile-wrapper" className="student-profile-wrapper">
              <button 
                id="professor-profile-trigger-btn"
                className="student-profile-trigger-btn" 
                onClick={toggleProfileDropdown}
              >
                <div id="professor-profile-avatar-mini" className="student-profile-avatar-mini">
                  {user?.profile_image_url ? (
                    <img 
                      src={user.profile_image_url}
                      alt="Profile"
                      className="student-profile-img-mini"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <User size={18} style={{ display: user?.profile_image_url ? 'none' : 'flex' }} />
                </div>
              </button>
              
              {showProfileDropdown && (
                <div id="professor-profile-dropdown-menu" className="student-profile-dropdown-menu">
                  <div id="professor-profile-dropdown-actions" className="student-profile-dropdown-actions">
                    <button 
                      className="student-profile-action-item" 
                      onClick={() => {
                        handleProfileEdit();
                        setShowProfileDropdown(false);
                      }}
                    >
                      <User size={18} />
                      <span>View Profile</span>
                    </button>
                    <div className="student-profile-divider-line"></div>
                    <button 
                      className="student-profile-action-item student-profile-logout-btn" 
                      onClick={handleLogout}
                    >
                      <LogOut size={18} />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
              <Menu size={20} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {showMobileMenu && (
          <div className="mobile-nav">
            <button 
              className={`mobile-nav-link ${activeSection === 'overview' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection('overview');
                setShowMobileMenu(false);
              }}
            >
              <Home size={18} />
              <span>Dashboard</span>
            </button>
            <button 
              className={`mobile-nav-link ${activeSection === 'courses' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection('courses');
                setShowMobileMenu(false);
              }}
            >
              <BookOpen size={18} />
              <span>My Courses</span>
            </button>
            <button 
              className={`mobile-nav-link ${activeSection === 'requests' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection('requests');
                setShowMobileMenu(false);
              }}
            >
              <Bell size={18} />
              <span>Requests</span>
              {getPendingRequests() > 0 && (
                <span className="notification-badge">{getPendingRequests()}</span>
              )}
            </button>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <div className="content-area">
          {error && (
            <div className="error-banner">
              <AlertCircle size={20} />
              <p>{error}</p>
            </div>
          )}

          {/* Dashboard Overview */}
          {activeSection === 'overview' && (
            <div className="overview-section">
              {/* Welcome Header with Stats */}
              <div className="welcome-header-with-stats">
                {/* Aurora Background */}
                <div className="aurora-background">
                  <Aurora
                    colorStops={["#822130", "#2e144d", "#88202a"]}
                    blend={0.5}
                    amplitude={1.0}
                    speed={0.5}
                  />
                </div>
                <div className="welcome-content">
                  <br></br>
                  <h1 className="welcome-title">Welcome back, {user?.firstName}!</h1>
                  <p className="welcome-description">Ready to continue teaching? Let's see what's happening with your courses today.</p>
                  <div className="welcome-actions">
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowCreateModal(true)}
                    >
                      <Plus size={16} />
                      Create Course
                    </button>
                  </div>
                </div>

                {/* Vertical Stats Tubes */}
                <div className="vertical-stats">
                  <div className="stat-tube">
                    <div className="stat-icon">
                      <BookOpen size={20} />
                    </div>
                    <div className="stat-content">
                      <h3>{courses.length}</h3>
                      <p>Active Courses</p>
                    </div>
                  </div>
                  <div className="stat-tube">
                    <div className="stat-icon">
                      <Clock size={20} />
                    </div>
                    <div className="stat-content">
                      <h3>{pendingCourses.length}</h3>
                      <p>Pending Class Approval</p>
                    </div>
                  </div>
                  <div className="stat-tube">
                    <div className="stat-icon">
                      <Users size={20} />
                    </div>
                    <div className="stat-content">
                      <h3>{getTotalStudents()}</h3>
                      <p>Total Students</p>
                    </div>
                  </div>
                  <div className="stat-tube">
                    <div className="stat-icon">
                      <Bell size={20} />
                    </div>
                    <div className="stat-content">
                      <h3>{getPendingRequests()}</h3>
                      <p>Join Requests</p>
                    </div>
                  </div>
                </div>
              </div>
              <br></br>
              {/* Courses Section */}
              <div className="courses-section">
                <h2 className="section-title">My Courses</h2>
                
                <div className="courses-grid">
                  {courses.map(course => (
                    <div 
                      key={course.id} 
                      className="course-card"
                      onClick={() => navigate(`/course/professor/${course.id}`)}
                    >
                      {/* Crosshair Corners */}
                      <div className="course-crosshair-corner course-crosshair-top-left"></div>
                      <div className="course-crosshair-corner course-crosshair-top-right"></div>
                      <div className="course-crosshair-corner course-crosshair-bottom-left"></div>
                      <div className="course-crosshair-corner course-crosshair-bottom-right"></div>

                      <div className="course-header">
                        <h3 className="course-title">{course.course_name}</h3>
                        <div className="course-code">{course.course_code}</div>
                      </div>

                      <div className="course-details">
                        <div className="course-details-grid">
                          <div className="detail-item">
                            <span className="detail-label">Program</span>
                            <span className="detail-value">{course.program}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Section</span>
                            <span className="detail-value">{course.section}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Students</span>
                            <span className="detail-value">{course.current_student_count}/{course.max_students}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Semester</span>
                            <span className="detail-value">{course.semester} {course.school_year}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {courses.length === 0 && (
                    <div className="empty-courses">
                      <BookOpen size={48} />
                      <h3>No courses yet</h3>
                      <p>Create your first course to start teaching</p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowCreateModal(true)}
                      >
                        <Plus size={16} />
                        Create Course
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Projects & Recent Activities */}
              <div className="projects-activities-grid">
                {/* Active Projects Section */}
                <div className="active-projects-section">
                  {/* Crosshair Corners */}
                  <div className="section-crosshair-corner section-crosshair-top-left"></div>
                  <div className="section-crosshair-corner section-crosshair-top-right"></div>
                  <div className="section-crosshair-corner section-crosshair-bottom-left"></div>
                  <div className="section-crosshair-corner section-crosshair-bottom-right"></div>
                  
                  <h2 className="section-title">Active Courses</h2>
                  <div className="projects-list">
                    {courses.slice(0, 3).map(course => (
                      <div key={course.id} className="project-pill">
                        <div className="project-icon">
                          <FileText size={20} />
                        </div>
                        <div className="project-info">
                          <h4>{course.course_name}</h4>
                          <p className="project-details">
                            <span className="phase-info">{course.course_code} - {course.section}</span>
                            <span className="due-date">{course.current_student_count} students</span>
                          </p>
                        </div>
                        <div className="phase-progress">
                          <div className="phase-bar">
                            <div className="phase-fill" style={{width: `${(course.current_student_count / course.max_students) * 100}%`}}></div>
                          </div>
                          <div className="phase-percentage">{Math.round((course.current_student_count / course.max_students) * 100)}%</div>
                        </div>
                        <button 
                          className="project-action-btn"
                          onClick={() => navigate(`/course/professor/${course.id}`)}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    ))}
                    {courses.length === 0 && (
                      <div className="empty-state">
                        <FileText size={48} />
                        <h3>No active courses</h3>
                        <p>Create a course to see it here</p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => setShowCreateModal(true)}
                        >
                          <Plus size={16} />
                          Create Course
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Activities Section */}
                <div className="recent-activities-section">
                  {/* Crosshair Corners */}
                  <div className="section-crosshair-corner section-crosshair-top-left"></div>
                  <div className="section-crosshair-corner section-crosshair-top-right"></div>
                  <div className="section-crosshair-corner section-crosshair-bottom-left"></div>
                  <div className="section-crosshair-corner section-crosshair-bottom-right"></div>
                  
                  <h2 className="section-title">Recent Activities</h2>
                  <div className="activities-list">
                    <div className="activity-item">
                      <div className="activity-icon">
                        <CheckCircle size={20} />
                      </div>
                      <div className="activity-content">
                        <h4>Course Created</h4>
                        <p>New course has been set up</p>
                        <span className="activity-time">2 hours ago</span>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon">
                        <Users size={20} />
                      </div>
                      <div className="activity-content">
                        <h4>Student Enrolled</h4>
                        <p>New student joined your course</p>
                        <span className="activity-time">5 hours ago</span>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon">
                        <Bell size={20} />
                      </div>
                      <div className="activity-content">
                        <h4>Join Request</h4>
                        <p>New student requesting to join</p>
                        <span className="activity-time">1 day ago</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Courses Section */}
          {activeSection === 'courses' && (
            <div className="courses-section">
              {/* Aurora Background */}
              <div className="section-aurora-background">
                <Aurora
                  colorStops={["#822130", "#2e144d", "#88202a"]}
                  blend={0.5}
                  amplitude={1.0}
                  speed={0.5}
                />
              </div>
              
              <div className="section-header">
                <h2>My Courses</h2>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <Plus size={16} />
                  Create Course
                </button>
              </div>

              {courses.length === 0 ? (
                <div className="empty-state">
                  <BookOpen size={64} />
                  <h3>No courses created</h3>
                  <p>Create your first course to start teaching and managing students</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create Course
                  </button>
                </div>
              ) : (
                <div className="courses-grid">
                  {courses.map(course => (
                    <div key={course.id} className="course-card">
                      {/* Crosshair Corners */}
                      <div className="course-crosshair-corner course-crosshair-top-left"></div>
                      <div className="course-crosshair-corner course-crosshair-top-right"></div>
                      <div className="course-crosshair-corner course-crosshair-bottom-left"></div>
                      <div className="course-crosshair-corner course-crosshair-bottom-right"></div>

                      <div className="course-header" style={{ textAlign: 'center', marginBottom: '1rem', paddingTop: '0.5rem' }}>
                        <h3 className="course-title" style={{ 
                          fontSize: '1.1rem', 
                          fontWeight: '700', 
                          color: '#FFFFFF', 
                          margin: '0 0 0.75rem 0',
                          textAlign: 'center'
                        }}>
                          {course.course_name}
                        </h3>
                        <div className="course-code" style={{
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: 'white',
                          margin: '0',
                          textAlign: 'center',
                          background: 'linear-gradient(135deg, #BE3144, #872341)',
                          padding: '0.5rem 1rem',
                          borderRadius: '0px',
                          display: 'inline-block',
                          boxShadow: '0 2px 8px rgba(190, 49, 68, 0.4)'
                        }}>
                          {course.course_code}
                        </div>
                      </div>
                      
                      <div className="course-info-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '1rem',
                        marginBottom: '2rem'
                      }}>
                        <div className="info-item" style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}>
                          <div className="info-label" style={{
                            color: '#E5E5CB',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Program</div>
                          <div className="info-value" style={{
                            color: '#FFFFFF',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>{course.program}</div>
                        </div>
                        <div className="info-item" style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}>
                          <div className="info-label" style={{
                            color: '#E5E5CB',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Section</div>
                          <div className="info-value" style={{
                            color: '#FFFFFF',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>{course.section}</div>
                        </div>
                        <div className="info-item" style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}>
                          <div className="info-label" style={{
                            color: '#E5E5CB',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Students</div>
                          <div className="info-value" style={{
                            color: '#FFFFFF',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>{course.current_student_count}/{course.max_students}</div>
                        </div>
                        <div className="info-item" style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}>
                          <div className="info-label" style={{
                            color: '#E5E5CB',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Join Code</div>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            padding: '0.4rem 0.6rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => copyJoinCode(course.join_code)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                          }}
                          title="Click to copy join code">
                            <div className="info-value" style={{
                              color: '#FFFFFF',
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              userSelect: 'all',
                              letterSpacing: '1px'
                            }}>{course.join_code}</div>
                            <Copy size={16} style={{ 
                              color: '#E5E5CB',
                              flexShrink: 0
                            }} />
                          </div>
                        </div>
                        <div className="info-item" style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem'
                        }}>
                          <div className="info-label" style={{
                            color: '#E5E5CB',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Semester</div>
                          <div className="info-value" style={{
                            color: '#FFFFFF',
                            fontSize: '0.9rem',
                            fontWeight: '600'
                          }}>{course.semester} {course.school_year}</div>
                        </div>
                      </div>
                      
                      <div className="course-actions" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginTop: '1rem'
                      }}>
                        <button 
                          className="btn btn-primary course-enter-btn"
                          onClick={() => navigate(`/course/professor/${course.id}`)}
                          style={{
                            width: '100%',
                            justifyContent: 'center',
                            padding: '1rem 2rem',
                            fontSize: '1rem',
                            fontWeight: '700',
                            borderRadius: '0px',
                            boxShadow: '0 4px 16px rgba(190, 49, 68, 0.4)'
                          }}
                        >
                          <BookOpen size={18} />
                          Enter Course
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Requests Section */}
          {activeSection === 'requests' && (
            <div className="requests-section">
              {/* Aurora Background */}
              <div className="section-aurora-background">
                <Aurora
                  colorStops={["#822130", "#2e144d", "#88202a"]}
                  blend={0.5}
                  amplitude={1.0}
                  speed={0.5}
                />
              </div>
              
              <div className="requests-two-column-grid">
                {/* Left Column: Class Join Requests */}
                <div className="request-column">
                  <div className="section-header" style={{ borderBottom: '2px solid rgba(225, 117, 100, 0.3)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: '#FFFFFF', margin: '0' }}>Class Join Requests</h2>
                  </div>

                  {getPendingRequests() === 0 ? (
                    <div className="empty-state" style={{
                      textAlign: 'center',
                      padding: '3rem 2rem',
                      background: 'transparent',
                      borderRadius: '0px',
                      border: '2px dashed rgba(225, 117, 100, 0.5)'
                    }}>
                      <MessageSquare size={64} style={{ color: '#E17564', marginBottom: '1rem' }} />
                      <h3 style={{ color: '#FFFFFF', marginBottom: '0.5rem' }}>No pending join requests</h3>
                      <p style={{ color: '#E5E5CB' }}>All student join requests have been processed</p>
                    </div>
                  ) : (
                    <div className="requests-list">
                      {joinRequests.filter(req => req.status === 'pending').map(request => (
                        <div key={request.id} className="request-card" style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(225, 117, 100, 0.3)',
                          borderRadius: '12px',
                          padding: '1.5rem',
                          marginBottom: '1rem'
                        }}>
                          <div className="request-header" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem'
                          }}>
                            <h4 style={{ color: '#FFFFFF', margin: '0', fontSize: '1.1rem', fontWeight: '700' }}>
                              {request.student_name}
                            </h4>
                          </div>
                          <div className="request-details" style={{ marginBottom: '1rem' }}>
                            <p style={{ color: '#E5E5CB', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                              <strong style={{ color: '#FFFFFF' }}>Course:</strong> {request.course_name} ({request.course_code})
                            </p>
                            <p style={{ color: '#E5E5CB', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                              <strong style={{ color: '#FFFFFF' }}>Student Number:</strong> {request.student_number}
                            </p>
                            {request.message && (
                              <p style={{ color: '#E5E5CB', margin: '0.5rem 0', fontSize: '0.9rem' }}>
                                <strong style={{ color: '#FFFFFF' }}>Message:</strong> {request.message}
                              </p>
                            )}
                            <span className="request-date" style={{ 
                              color: 'rgba(255, 255, 255, 0.6)',
                              fontSize: '0.75rem',
                              fontStyle: 'italic'
                            }}>
                              Requested: {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="request-actions" style={{
                            display: 'flex',
                            gap: '0.75rem'
                          }}>
                            <button 
                              className="btn btn-success"
                              onClick={() => handleJoinRequestAction(request.id, 'approve')}
                              style={{
                                background: '#28a745',
                                color: 'white',
                                border: '2px solid #FFFFFF',
                                padding: '0.65rem 1.25rem',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <CheckCircle size={16} />
                              Approve
                            </button>
                            <button 
                              className="btn btn-danger"
                              onClick={() => {
                                const reason = prompt('Rejection reason (optional):');
                                handleJoinRequestAction(request.id, 'reject', reason || '');
                              }}
                              style={{
                                background: '#dc3545',
                                color: 'white',
                                border: '2px solid #FFFFFF',
                                padding: '0.65rem 1.25rem',
                                fontSize: '0.9rem',
                                fontWeight: '700',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem'
                              }}
                            >
                              <XCircle size={16} />
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Class Creation Requests */}
                <div className="request-column">
                  <div className="section-header" style={{ borderBottom: '2px solid rgba(225, 117, 100, 0.3)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ color: '#FFFFFF', margin: '0' }}>Class Creation Requests</h2>
                  </div>

                  <div className="empty-state" style={{
                    textAlign: 'center',
                    padding: '3rem 2rem',
                    background: 'transparent',
                    borderRadius: '0px',
                    border: '2px dashed rgba(225, 117, 100, 0.5)'
                  }}>
                    <CheckCircle size={64} style={{ color: '#E17564', marginBottom: '1rem' }} />
                    <h3 style={{ color: '#FFFFFF', marginBottom: '0.5rem' }}>No creation requests</h3>
                    <p style={{ color: '#E5E5CB' }}>Admin notifications for course creation approvals will appear here</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Create Course Modal */}
      {showCreateModal && (
  <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
    <div className="modal-content large" onClick={e => e.stopPropagation()}>
      <div className="modal-header">
        <h2>Create New Course</h2>
        <div className="modal-header-controls" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div className="creation-mode-toggle" style={{ display: 'flex', gap: '0.5rem', backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '0.25rem', borderRadius: '8px' }}>
            <button
              type="button"
              onClick={() => setCourseCreationMode('manual')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                background: courseCreationMode === 'manual' ? 'rgba(225, 117, 100, 0.5)' : 'transparent',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                if (courseCreationMode !== 'manual') e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                if (courseCreationMode !== 'manual') e.target.style.background = 'transparent';
              }}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setCourseCreationMode('preset')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '0.9rem',
                transition: 'all 0.3s ease',
                background: courseCreationMode === 'preset' ? 'rgba(225, 117, 100, 0.5)' : 'transparent',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                if (courseCreationMode !== 'preset') e.target.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                if (courseCreationMode !== 'preset') e.target.style.background = 'transparent';
              }}
            >
              Preset
            </button>
          </div>
          <button 
            className="close-btn"
            onClick={() => setShowCreateModal(false)}
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <form onSubmit={handleCreateCourse} className="modal-body">
        {courseCreationMode === 'manual' ? (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Course Name <span className="required">*</span></label>
                <input
                  type="text"
                  value={courseForm.courseName}
                  onChange={(e) => setCourseForm({...courseForm, courseName: e.target.value})}
                  placeholder="e.g., Introduction to Programming"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Program <span className="required">*</span></label>
                <select
                  value={courseForm.program}
                  onChange={(e) => setCourseForm({...courseForm, program: e.target.value})}
                  className="form-input"
                  required
                >
                  <option value="">Select a Program</option>
                  <option value="BSIT">BSIT</option>
                  <option value="BSEMC">BSEMC</option>
                  <option value="BSCS">BSCS</option>
                </select>
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Course Code <span className="required">*</span></label>
                <input
                  type="text"
                  value={courseForm.courseCode}
                  onChange={(e) => setCourseForm({...courseForm, courseCode: e.target.value})}
                  placeholder="e.g., CS101"
                  disabled={!courseForm.program}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Section <span className="required">*</span></label>
                <input
                  type="text"
                  value={courseForm.section}
                  onChange={(e) => setCourseForm({...courseForm, section: e.target.value})}
                  placeholder="e.g., A, B, 1, 2"
                  required
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Max Students <span className="required">*</span></label>
                <input
                  type="number"
                  value={courseForm.maxStudents}
                  onChange={(e) => setCourseForm({...courseForm, maxStudents: parseInt(e.target.value)})}
                  min="1"
                  max="100"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Semester <span className="required">*</span></label>
                <select
                  value={courseForm.semester}
                  onChange={(e) => setCourseForm({...courseForm, semester: e.target.value})}
                  className="form-input"
                  required
                >
                  <option value="">Select a Semester</option>
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>School Year <span className="required">*</span></label>
                <select
                  value={courseForm.schoolYear}
                  onChange={(e) => setCourseForm({...courseForm, schoolYear: e.target.value})}
                  className="form-input"
                  required
                >
                  <option value="">Select a School Year</option>
                  <option value="2021-2022">2021-2022</option>
                  <option value="2022-2023">2022-2023</option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>
              <div className="form-group">
                {/* Empty div to maintain grid layout */}
              </div>
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={courseForm.description}
                onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                placeholder="Course description and objectives"
                className="form-textarea"
                rows="4"
              />
            </div>
          </>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label>Program <span className="required">*</span></label>
                <select
                  value={presetForm.program}
                  onChange={(e) => setPresetForm({...presetForm, program: e.target.value, presetCourse: ''})}
                  className="form-input"
                  required
                >
                  <option value="">Select a Program</option>
                  <option value="BSIT">BSIT</option>
                  <option value="BSCS">BSCS</option>
                </select>
              </div>
              <div className="form-group">
                <label>Course Code <span className="required">*</span></label>
                <select
                  value={presetForm.presetCourse}
                  onChange={(e) => setPresetForm({...presetForm, presetCourse: e.target.value})}
                  className="form-input"
                  disabled={!presetForm.program}
                  required
                >
                  <option value="">
                    {presetForm.program ? 'Choose a course' : 'Select a program first'}
                  </option>
                  {presetForm.program && presetCoursesByProgram[presetForm.program]?.map(course => (
                    <option key={course.id} value={course.id}>
                      {course.code}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group form-group-full">
                <label>Course Name</label>
                <input
                  type="text"
                  value={presetForm.presetCourse ? presetCoursesByProgram[presetForm.program]?.find(c => c.id === presetForm.presetCourse)?.name?.split(/\s[–-]\s/)[1] || '' : ''}
                  readOnly
                  placeholder="Course name will appear here"
                  className="form-input"
                />
              </div>
            </div>            <div className="form-row">
              <div className="form-group">
                <label>Section <span className="required">*</span></label>
                <input
                  type="text"
                  value={presetForm.section}
                  onChange={(e) => setPresetForm({...presetForm, section: e.target.value})}
                  placeholder="e.g., A, B, 1, 2"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Semester <span className="required">*</span></label>
                <select
                  value={presetForm.semester}
                  onChange={(e) => setPresetForm({...presetForm, semester: e.target.value})}
                  className="form-input"
                  required
                >
                  <option value="">Select a Semester</option>
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Max Students <span className="required">*</span></label>
                <input
                  type="number"
                  value={presetForm.maxStudents}
                  onChange={(e) => setPresetForm({...presetForm, maxStudents: parseInt(e.target.value)})}
                  min="1"
                  max="100"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>School Year <span className="required">*</span></label>
                <select
                  value={presetForm.schoolYear}
                  onChange={(e) => setPresetForm({...presetForm, schoolYear: e.target.value})}
                  className="form-input"
                  required
                >
                  <option value="">Select a School Year</option>
                  <option value="2021-2022">2021-2022</option>
                  <option value="2022-2023">2022-2023</option>
                  <option value="2023-2024">2023-2024</option>
                  <option value="2024-2025">2024-2025</option>
                  <option value="2025-2026">2025-2026</option>
                  <option value="2026-2027">2026-2027</option>
                </select>
              </div>
            </div>
          </>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-outline" onClick={() => setShowCreateModal(false)}>
            Cancel
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={courseCreationMode === 'manual' 
              ? !courseForm.courseName || !courseForm.courseCode || !courseForm.program || !courseForm.section || !courseForm.maxStudents || !courseForm.semester || !courseForm.schoolYear
              : !presetForm.program || !presetForm.presetCourse || !presetForm.section || !presetForm.maxStudents || !presetForm.semester || !presetForm.schoolYear
            }
          >
            Create Course
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Students Modal */}
      {showStudentsModal && selectedCourse && (
        <div className="modal-overlay" onClick={() => setShowStudentsModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Students - {selectedCourse.course_name}</h2>
              <button 
                className="close-btn"
                onClick={() => setShowStudentsModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="students-list">
                {selectedCourse.students && selectedCourse.students.length > 0 ? (
                  selectedCourse.students.map(student => (
                    <div key={student.id} className="student-item">
                      <div className="student-info">
                        <h4>{student.student_name}</h4>
                        <p><strong>Student Number:</strong> {student.student_number}</p>
                        <p><strong>Program:</strong> {student.program}</p>
                        <p><strong>Year Level:</strong> {student.year_level}</p>
                        <span className="enrollment-date">
                          Enrolled: {new Date(student.enrolled_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-data">No students enrolled yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {/* Profile View/Edit Modal */}
      {showProfileEdit && (
        <div className="modal-overlay" onClick={() => {
          setShowProfileEdit(false);
          setIsEditingProfile(false);
        }}>
          <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header - Colored bar with title and X button */}
            <div className="modal-header">
              <h2>My Profile</h2>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowProfileEdit(false);
                  setIsEditingProfile(false);
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body profile-modal-body">
              {/* Profile Header with Avatar */}
              <div className="profile-modal-header">
                <div className="profile-modal-avatar">
                  {user?.profile_image_url ? (
                    <img 
                      src={user.profile_image_url}
                      alt="Profile"
                      className="profile-modal-img"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <User size={48} style={{ display: user?.profile_image_url ? 'none' : 'flex' }} />
                </div>
                <div className="profile-modal-user-info">
                  <h3>{user?.firstName} {user?.lastName}</h3>
                  <p>{user?.employeeNumber}</p>
                </div>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleProfileUpdate} className="profile-form-grid">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm({...profileForm, firstName: e.target.value})}
                    className="form-input"
                    readOnly={!isEditingProfile}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm({...profileForm, lastName: e.target.value})}
                    className="form-input"
                    readOnly={!isEditingProfile}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    className="form-input"
                    readOnly
                    disabled
                    style={{ 
                      backgroundColor: '#f3f4f6', 
                      cursor: 'not-allowed',
                      color: '#6b7280'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Employee Number</label>
                  <input
                    type="text"
                    value={profileForm.employeeNumber}
                    className="form-input"
                    readOnly
                    disabled
                    style={{ 
                      backgroundColor: '#f3f4f6', 
                      cursor: 'not-allowed',
                      color: '#6b7280'
                    }}
                  />
                </div>

                <div className="form-group form-group-full">
                  <label>College</label>
                  <input
                    type="text"
                    value={profileForm.college}
                    className="form-input"
                    readOnly
                    disabled
                    style={{ 
                      backgroundColor: '#f3f4f6', 
                      cursor: 'not-allowed',
                      color: '#6b7280'
                    }}
                  />
                </div>

                <div className="modal-actions modal-actions-full">
                  {!isEditingProfile ? (
                    <>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={(e) => {
                          e.preventDefault();
                          setShowProfileEdit(false);
                          setIsEditingProfile(false);
                        }}
                      >
                        Close
                      </button>
                      <button 
                        type="button" 
                        className="btn btn-primary"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditingProfile(true);
                        }}
                      >
                        <Edit size={18} /> Edit Profile
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        type="button" 
                        className="btn btn-outline" 
                        onClick={(e) => {
                          e.preventDefault();
                          setIsEditingProfile(false);
                        }}
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit" 
                        className="btn btn-primary" 
                        disabled={updatingProfile}
                      >
                        {updatingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .professor-dashboard {
          min-height: 100vh;
          background: #09122C;
          width: 100%;
          position: relative;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          overflow-x: hidden;
        }

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
        }

        .loading-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #f8f9fa;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #e9ecef;
          border-top: 4px solid #495057;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Top Navigation */
        .top-nav {
          background: #09122C;
          border-bottom: 1px solid rgba(225, 117, 100, 0.3);
          position: sticky;
          top: 0;
          z-index: 1000;
          backdrop-filter: blur(10px);
          isolation: isolate;
          overflow: visible;
        }

        .nav-container {
          width: 100%;
          padding: 0 2.4rem 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 64px;
          position: relative;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-left: 4.0rem;
        }

        .logo-image {
          height: 32px;
          width: auto;
        }

        .nav-links {
          display: flex;
          gap: 0.5rem;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 12px;
          transition: all 0.3s ease;
          color: #FFFFFF;
          font-weight: 500;
          position: relative;
          font-size: 0.9rem;
        }

        .nav-link:hover {
          background-color: rgba(190, 49, 68, 0.2);
          color: #E17564;
          transform: translateY(-1px);
        }

        .nav-link.active {
          background-color: rgba(190, 49, 68, 0.3);
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(225, 117, 100, 0.2);
        }

        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 50%;
          transform: translateX(-50%);
          width: 20px;
          height: 2px;
          background-color: #E17564;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 1rem;
          position: relative;
        }

        /* ========================================
           STUDENT PROFILE DROPDOWN - ULTRA UNIQUE STYLES
           ======================================== */
        
        #student-profile-wrapper,
        .student-profile-wrapper {
          position: relative;
          z-index: 9999;
          isolation: isolate;
          margin-right: 50%;
        }

        #student-profile-trigger-btn,
        .student-profile-trigger-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          background: linear-gradient(135deg, rgba(135, 35, 65, 0.18), rgba(190, 49, 68, 0.12));
          border: none;
          cursor: pointer;
          border-radius: 50%;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          color: #FFFFFF;
          position: relative;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(135, 35, 65, 0.15);
          width: 48px;
          height: 48px;
        }

        #student-profile-trigger-btn::before,
        .student-profile-trigger-btn::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(225, 117, 100, 0.15) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        #student-profile-trigger-btn:hover::before,
        .student-profile-trigger-btn:hover::before {
          opacity: 1;
        }

        #student-profile-trigger-btn:hover,
        .student-profile-trigger-btn:hover {
          background: linear-gradient(135deg, rgba(190, 49, 68, 0.3), rgba(135, 35, 65, 0.25));
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(225, 117, 100, 0.35);
        }

        #student-profile-avatar-mini,
        .student-profile-avatar-mini {
          width: 100%;
          height: 100%;
          background: transparent;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          overflow: hidden;
          flex-shrink: 0;
          position: relative;
          z-index: 2;
        }

        .student-profile-img-mini {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }

        #student-profile-dropdown-menu,
        .student-profile-dropdown-menu {
          position: absolute;
          top: calc(100% + 0.75rem);
          right: 0;
          background: rgba(9, 18, 44, 0.95) !important;
          border-radius: 16px !important;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(135, 35, 65, 0.4) !important;
          width: 220px;
          min-width: 200px;
          max-width: 240px;
          z-index: 9998;
          overflow: hidden;
          animation: studentProfileDropdownSlideIn 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: auto;
        }

        @keyframes studentProfileDropdownSlideIn {
          from {
            opacity: 0;
            transform: translateY(-15px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        #student-profile-dropdown-actions,
        .student-profile-dropdown-actions {
          padding: 0.75rem 0.5rem;
          background: transparent !important;
        }

        .student-profile-action-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 0.875rem 1rem;
          background: transparent !important;
          border: none;
          cursor: pointer;
          border-radius: 10px;
          transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
          color: #FFFFFF !important;
          text-align: left;
          font-size: 0.9rem;
          font-weight: 600;
          position: relative;
          overflow: hidden;
        }


        .student-profile-action-item:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          transform: translateX(5px);
          box-shadow: -4px 0 16px rgba(225, 117, 100, 0.25);
        }

        .student-profile-action-item svg {
          transition: transform 0.35s ease;
          flex-shrink: 0;
        }

        .student-profile-action-item:hover svg {
          transform: scale(1.15) rotate(5deg);
        }

        .student-profile-logout-btn {
          color: #E17564 !important;
        }

        .student-profile-logout-btn:hover {
          background: rgba(225, 117, 100, 0.2) !important;
          color: #FF8A7A !important;
        }

        .student-profile-divider-line {
          margin: 0.5rem 1rem;
          border: none;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
        }

        /* END STUDENT PROFILE DROPDOWN STYLES */

        .notification-badge {
          position: absolute;
          top: 0;
          right: 0;
          background: #dc3545;
          color: white;
          border-radius: 50%;
          width: 16px;
          height: 16px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Mobile Menu */
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          color: #FFFFFF;
        }

        .mobile-nav {
          display: none;
          background: #09122C;
          border-top: 1px solid rgba(225, 117, 100, 0.3);
          padding: 1rem;
        }

        .mobile-nav-link {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem;
          background: none;
          border: none;
          cursor: pointer;
          border-radius: 6px;
          transition: background-color 0.2s ease;
          color: #FFFFFF;
          margin-bottom: 0.25rem;
        }

        .mobile-nav-link:hover {
          background-color: rgba(190, 49, 68, 0.2);
          color: #E17564;
        }

        .mobile-nav-link.active {
          background-color: rgba(190, 49, 68, 0.3);
          color: #FFFFFF;
        }

        /* Main Content */
        .main-content {
          min-height: calc(100vh - 64px);
          width: 100%;
          background: transparent;
          position: relative;
          z-index: 1;
          padding: 0;
          overflow-x: hidden;
        }

        /* Content Area */
        .content-area {
          padding: 0;
          width: 100%;
          background: transparent;
          max-width: 1400px;
          margin: 0 auto;
          overflow: visible;
        }
        
        .overview-section {
          width: 100%;
          padding: 0 0 2rem 0;
          overflow: visible;
        }

        .error-banner {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 2rem;
          color: #721c24;
        }

        /* Welcome Header */
        .welcome-title {
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.6rem;
          color: #FFFFFF;
        }

        .welcome-description {
          font-size: 1.2rem;
          line-height: 1.6;
          margin-bottom: 1.5rem;
          color: #E5E5CB !important;
          max-width: 600px;
        }

        .welcome-actions {
          display: flex;
          gap: 1rem;
        }

        /* Welcome Header with Stats */
        .welcome-header-with-stats {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 2rem;
          margin-left: calc(-50vw + 50%);
          margin-right: calc(-50vw + 50%);
          margin-top: 0;
          width: 100vw;
          gap: 2rem;
          background: transparent;
          padding: 3rem calc(50vw - 50% + 2rem);
          border-radius: 0px;
          border: none;
          backdrop-filter: none;
          box-shadow: none;
          position: relative;
          overflow: visible;
        }

        .aurora-background {
          position: absolute;
          top: -20%;
          left: 50%;
          width: 120vw;
          height: 140%;
          transform: translateX(-50%);
          z-index: 0;
          pointer-events: none;
          overflow: visible;
        }

        .aurora-background canvas {
          width: 100% !important;
          height: 100% !important;
          min-width: 120vw !important;
          display: block !important;
        }

        .aurora-container {
          width: 100% !important;
          height: 100% !important;
          min-width: 120vw !important;
        }

        /* Section Aurora Background (for Courses & Progress) */
        .section-aurora-background {
          position: absolute;
          top: 0;
          left: 50%;
          width: 120vw;
          height: 100%;
          transform: translateX(-50%);
          z-index: 0;
          pointer-events: none;
          overflow: visible;
        }

        .section-aurora-background canvas {
          width: 100% !important;
          height: 100% !important;
          min-width: 120vw !important;
          display: block !important;
        }

        .section-aurora-background .aurora-container {
          width: 100% !important;
          height: 100% !important;
          min-width: 120vw !important;
        }

        .courses-section > *:not(.section-aurora-background),
        .progress-section > *:not(.section-aurora-background) {
          position: relative;
          z-index: 1;
        } 

        .welcome-content {
          flex: 1;
          position: relative;
          z-index: 1;
        }

        /* Vertical Stats Tubes */
        .vertical-stats {
          display: flex;
          gap: 2.5rem;
          min-width: 300px;
          min-height: 100px;
          position: relative;
          z-index: 1;
        }

        .stat-tube {
          background: rgba(255, 255, 255, 0.1) !important;
          border-radius: 0px !important;
          padding: 1.5rem 1rem;
          border: 2px solid rgba(255, 255, 255, 0.3) !important;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
          backdrop-filter: blur(20px) !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          transition: all 0.3s ease;
          min-height: 120px;
          flex: 1;
          animation: floatGracefully 12s ease-in-out infinite;
        }

        .stat-tube:nth-child(1) {
          animation-delay: 0s;
        }

        .stat-tube:nth-child(2) {
          animation-delay: 3s;
        }

        .stat-tube:nth-child(3) {
          animation-delay: 6s;
        }

        .stat-tube:nth-child(4) {
          animation-delay: 9s;
        }

        .stat-tube:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.2) !important;
          box-shadow: 0 8px 24px rgba(225, 117, 100, 0.5) !important;
          animation-play-state: paused;
          border-color: rgba(225, 117, 100, 0.6) !important;
        }

        @keyframes floatGracefully {
          0%, 100% {
            transform: translateY(0px);
          }
          20% {
            transform: translateY(-3px);
          }
          40% {
            transform: translateY(-6px);
          }
          60% {
            transform: translateY(-4px);
          }
          80% {
            transform: translateY(-8px);
          }
        }

        .stat-tube .stat-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #BE3144, #872341);
          border-radius: 0px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(190, 49, 68, 0.4);
          border: 2px solid #872341;
          margin-bottom: 0.75rem;
        }

        .stat-tube .stat-content h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: #FFFFFF !important;
          line-height: 1;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .stat-tube .stat-content p {
          margin: 0;
          font-size: 0.75rem;
          color: #FFFFFF !important;
          font-weight: 500;
          line-height: 1.2;
          text-align: center;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        /* Course Cards */
        .courses-section {
          width: 100%;
          padding: 2rem;
          position: relative;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .section-header h2 {
          font-family: 'Georgia', serif;
          font-size: 1.5rem;
          font-weight: 700;
          color: #FFFFFF !important;
          margin: 0;
        }

        .section-title {
          font-family: 'Georgia', serif;
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 1rem;
          color: #FFFFFF !important;
          letter-spacing: -0.03em;
          text-align: center !important;
          width: fit-content !important;
          margin-left: auto !important;
          margin-right: auto !important;
          padding-bottom: 0.5rem !important;
          border-bottom: 1px solid #FFFFFF !important;
        }

        .courses-grid {
          display: grid !important;
          grid-template-columns: repeat(4, 1fr) !important;
          gap: 1.5rem !important;
          margin-top: 1rem !important;
          width: 100% !important;
          max-width: 1400px !important;
          margin-left: auto !important;
          margin-right: auto !important;
          padding: 0 2rem !important;
          justify-items: stretch !important;
        }

        .courses-grid[style*="grid-template-columns: 1fr"] {
          justify-items: center !important;
        }

        @media (max-width: 1400px) {
          .courses-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }

        @media (max-width: 1024px) {
          .courses-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        @media (max-width: 768px) {
          .courses-grid {
            grid-template-columns: 1fr !important;
            justify-items: center !important;
          }
        }

        .course-card {
          background: #09122C !important;
          border-radius: 0px !important;
          padding: 1.5rem !important;
          border: 2px solid #872341 !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(12px) !important;
          transition: all 0.3s ease !important;
          cursor: pointer !important;
          min-height: 200px !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          text-align: left !important;
          width: 100% !important;
          max-width: none !important;
          position: relative !important;
          overflow: visible !important;
        }

        @media (max-width: 768px) {
          .course-card {
            max-width: 320px !important;
          }
        }

        .course-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 4px 16px rgba(225, 117, 100, 0.2) !important;
          background: #09122C !important;
          border-color: #E17564 !important;
        }

        /* Course Card Crosshair Corners */
        .course-crosshair-corner {
          position: absolute;
          width: 16px;
          height: 16px;
          pointer-events: none;
        }

        .course-crosshair-top-left {
          top: -12px;
          left: -12px;
          border-top: 2px solid #FFFFFF;
          border-left: 2px solid #FFFFFF;
        }

        .course-crosshair-top-right {
          top: -12px;
          right: -12px;
          border-top: 2px solid #FFFFFF;
          border-right: 2px solid #FFFFFF;
        }

        .course-crosshair-bottom-left {
          bottom: -12px;
          left: -12px;
          border-bottom: 2px solid #FFFFFF;
          border-left: 2px solid #FFFFFF;
        }

        .course-crosshair-bottom-right {
          bottom: -12px;
          right: -12px;
          border-bottom: 2px solid #FFFFFF;
          border-right: 2px solid #FFFFFF;
        }

        .course-header {
          text-align: center !important;
          margin-bottom: 1rem !important;
          padding-top: 0.5rem !important;
        }

        .course-title {
          font-size: 1.1rem !important;
          font-weight: 700 !important;
          color: #FFFFFF !important;
          margin: 0 0 0.75rem 0 !important;
          line-height: 1.3 !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 2 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
          text-align: center !important;
          font-family: 'Inter', sans-serif !important;
        }

        .course-code {
          font-size: 0.9rem !important;
          font-weight: 600 !important;
          color: white !important;
          margin: 0 !important;
          text-align: center !important;
          background: linear-gradient(135deg, #BE3144, #872341) !important;
          padding: 0.5rem 1rem !important;
          border-radius: 0px !important;
          display: inline-block !important;
          box-shadow: 0 2px 8px rgba(190, 49, 68, 0.4) !important;
          font-family: 'Inter', sans-serif !important;
        }

        .course-details {
          background: transparent !important;
          padding: 1rem !important;
          border-radius: 0px !important;
          border: 1px solid rgba(225, 117, 100, 0.3) !important;
          backdrop-filter: blur(8px) !important;
        }

        .course-details-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 0.75rem !important;
        }

        .detail-item {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.375rem !important;
          text-align: left !important;
        }

        .detail-label {
          font-size: 0.75rem !important;
          color: #E5E5CB !important;
          font-weight: 600 !important;
          text-transform: uppercase !important;
          letter-spacing: 0.5px !important;
          text-align: left !important;
          font-family: 'Inter', sans-serif !important;
        }

        .detail-value {
          font-size: 0.85rem !important;
          color: #FFFFFF !important;
          font-weight: 700 !important;
          line-height: 1.3 !important;
          display: -webkit-box !important;
          -webkit-line-clamp: 1 !important;
          -webkit-box-orient: vertical !important;
          overflow: hidden !important;
          text-align: left !important;
          font-family: 'Inter', sans-serif !important;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .info-label {
          color: #E5E5CB;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .info-value {
          color: #FFFFFF;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .course-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .course-actions {
          display: flex;
          justify-content: center;
          margin-top: 1rem;
        }

        .course-enter-btn {
          width: 100%;
          justify-content: center;
          padding: 1rem 2rem;
          font-size: 1rem;
          font-weight: 700;
          border-radius: 0px;
          box-shadow: 0 4px 16px rgba(190, 49, 68, 0.4);
        }

        .course-enter-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(135, 35, 65, 0.5);
        }

        .course-join-code-section {
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .join-code-label {
          color: #6c757d;
          font-size: 0.8rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }

        .join-code-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .join-code-text {
          font-family: 'Courier New', monospace;
          font-size: 1.1rem;
          font-weight: 700;
          color: #504B38;
          background: transparent;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 2px solid #504B38;
          flex: 1;
        }

        .copy-join-btn {
          background: rgba(80, 75, 56, 0.1);
          border: 1px solid rgba(80, 75, 56, 0.2);
          border-radius: 8px;
          padding: 0.5rem;
          color: #504B38;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .copy-join-btn:hover {
          background: rgba(80, 75, 56, 0.2);
          border-color: rgba(80, 75, 56, 0.4);
          transform: scale(1.05);
        }

        .course-actions {
          display: flex;
          justify-content: center;
        }

        /* Buttons */
        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.875rem 1.75rem;
          border: none;
          border-radius: 0px;
          cursor: pointer;
          font-weight: 700;
          transition: all 0.3s ease;
          text-decoration: none;
          font-size: 1rem;
          position: relative;
          overflow: hidden;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .btn-primary {
          background: #BE3144 !important;
          color: white !important;
          box-shadow: 0 6px 20px rgba(190, 49, 68, 0.6) !important;
          border: 2px solid #FFFFFF !important;
          border-radius: 0px !important;
          padding: 0.65rem 1.625rem !important;
          font-size: 0.9rem !important;
          font-weight: 800 !important;
          position: relative !important;
        }

        .btn-primary::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .btn-primary:hover::before {
          left: 100%;
        }

        .btn-primary:hover {
          transform: translateY(-3px) scale(1.05) !important;
          box-shadow: 0 12px 30px rgba(135, 35, 65, 0.8) !important;
          background: #872341 !important;
          border-color: #E17564 !important;
        }

        .btn-primary:active {
          transform: translateY(-1px) scale(1.02) !important;
        }

        .btn-primary:disabled {
          background: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.4) !important;
          border-color: rgba(255, 255, 255, 0.2) !important;
          box-shadow: none !important;
          cursor: not-allowed !important;
          transform: none !important;
        }

        .btn-primary:disabled:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.4) !important;
          transform: none !important;
          box-shadow: none !important;
        }

        .btn-outline {
          background: transparent;
          color: #FFFFFF;
          border: 2px solid #872341;
          backdrop-filter: blur(10px);
          border-radius: 0px;
        }

        .btn-outline:hover {
          background: rgba(135, 35, 65, 0.2);
          border-color: #E17564;
          transform: translateY(-1px);
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.8rem;
        }

        .btn-success {
          background: #28a745;
          color: white;
          border: 2px solid #FFFFFF;
        }

        .btn-success:hover {
          background: #218838;
          transform: translateY(-2px);
        }

        .btn-danger {
          background: #dc3545;
          color: white;
          border: 2px solid #FFFFFF;
        }

        .btn-danger:hover {
          background: #c82333;
          transform: translateY(-2px);
        }

        /* Projects & Activities Grid */
        .projects-activities-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          margin-bottom: 2rem;
          padding: 0 2rem;
        }

        /* Active Projects Section */
        .active-projects-section {
          background: #09122C;
          border-radius: 0px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
          border: 2px solid #872341;
          box-shadow: none;
          transition: all 0.3s ease;
          position: relative;
          overflow: visible;
        }

        .active-projects-section:hover {
          border-color: #BE3144 !important;
          box-shadow: 0 4px 16px rgba(225, 117, 100, 0.2), 
                      0 0 30px rgba(190, 49, 68, 0.15),
                      inset 0 0 10px rgba(225, 117, 100, 0.05) !important;
        }

        .projects-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .project-pill {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 0.75rem 1rem;
          border: 1px solid rgba(225, 117, 100, 0.3);
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          cursor: pointer;
          backdrop-filter: blur(10px);
        }

        .project-pill:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(225, 117, 100, 0.3);
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(225, 117, 100, 0.5);
        }

        .project-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #BE3144, #872341);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 8px rgba(190, 49, 68, 0.4);
          flex-shrink: 0;
        }

        .project-info {
          flex: 1;
          min-width: 0;
        }

        .project-info h4 {
          margin: 0 0 0.25rem 0;
          color: #FFFFFF;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .project-details {
          margin: 0;
          display: flex;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #E5E5CB;
        }

        .phase-info {
          color: #FFFFFF;
        }

        .due-date {
          color: #E5E5CB;
        }

        .phase-progress {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }

        .phase-bar {
          width: 60px;
          height: 6px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }

        .phase-fill {
          height: 100%;
          background: linear-gradient(90deg, #BE3144, #872341);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .phase-percentage {
          font-size: 0.75rem;
          font-weight: 600;
          color: #FFFFFF;
          min-width: 35px;
        }

        .project-action-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(225, 117, 100, 0.3);
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .project-action-btn:hover {
          background: rgba(225, 117, 100, 0.3);
          transform: translateX(3px);
        }

        /* Recent Activities Section */
        .recent-activities-section {
          background: #09122C;
          border-radius: 0px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
          border: 2px solid #872341;
          box-shadow: none;
          transition: all 0.3s ease;
          position: relative;
          overflow: visible;
        }

        .recent-activities-section:hover {
          border-color: #BE3144 !important;
          box-shadow: 0 4px 16px rgba(225, 117, 100, 0.2), 
                      0 0 30px rgba(190, 49, 68, 0.15),
                      inset 0 0 10px rgba(225, 117, 100, 0.05) !important;
        }

        .activities-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-item {
          display: flex;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.1) !important;
          border-radius: 12px;
          border: 1px solid rgba(225, 117, 100, 0.3) !important;
          backdrop-filter: blur(10px) !important;
          transition: all 0.3s ease;
        }

        .activity-item:hover {
          background: rgba(255, 255, 255, 0.15) !important;
          border-color: rgba(225, 117, 100, 0.5) !important;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(225, 117, 100, 0.2);
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #BE3144, #872341);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 8px rgba(190, 49, 68, 0.4);
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
        }

        .activity-content h4 {
          margin: 0 0 0.25rem 0;
          color: #FFFFFF !important;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .activity-content p {
          margin: 0 0 0.25rem 0;
          color: #E5E5CB !important;
          font-size: 0.75rem;
        }

        .activity-time {
          color: #E5E5CB !important;
          font-size: 0.7rem;
          font-style: italic;
        }

        /* Section Crosshair Corners */
        .section-crosshair-corner {
          position: absolute;
          width: 16px;
          height: 16px;
          pointer-events: none;
        }

        .section-crosshair-top-left {
          top: -12px;
          left: -12px;
          border-top: 2px solid #FFFFFF;
          border-left: 2px solid #FFFFFF;
        }

        .section-crosshair-top-right {
          top: -12px;
          right: -12px;
          border-top: 2px solid #FFFFFF;
          border-right: 2px solid #FFFFFF;
        }

        .section-crosshair-bottom-left {
          bottom: -12px;
          left: -12px;
          border-bottom: 2px solid #FFFFFF;
          border-left: 2px solid #FFFFFF;
        }

        .section-crosshair-bottom-right {
          bottom: -12px;
          right: -12px;
          border-bottom: 2px solid #FFFFFF;
          border-right: 2px solid #FFFFFF;
        }

        /* Empty States */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 2px dashed rgba(225, 117, 100, 0.3);
        }

        .empty-state svg {
          color: #E17564;
          margin-bottom: 1rem;
        }

        .empty-state h3 {
          color: #FFFFFF !important;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #E5E5CB !important;
          margin-bottom: 1.5rem;
        }

        .empty-courses {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 0px;
          border: 2px dashed rgba(225, 117, 100, 0.5);
        }

        .empty-courses svg {
          color: #E17564;
          margin-bottom: 1rem;
        }

        .empty-courses h3 {
          color: #FFFFFF !important;
          margin-bottom: 0.5rem;
        }

        .empty-courses p {
          color: #E5E5CB !important;
          margin-bottom: 1.5rem;
        }

        .error-banner {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 2rem;
          color: #721c24;
        }

        /* Overview Section */
        .overview-section {
          width: 100%;
          background: transparent;
        }

        .welcome-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          border: 1px solid #e9ecef;
        }

        .welcome-card h2 {
          margin: 0 0 0.5rem 0;
          color: #495057;
          font-size: 1.75rem;
        }

        .welcome-card p {
          margin: 0;
          color: #6c757d;
          font-size: 1rem;
        }

        .quick-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          width: 100%;
          background: transparent;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          text-decoration: none;
          font-size: 0.875rem;
        }

        .btn-primary {
          background: #495057;
          color: white;
        }

        .btn-primary:hover {
          background: #343a40;
        }

        .btn-secondary {
          background: white;
          color: #495057;
          border: 1px solid #e9ecef;
        }

        .btn-secondary:hover {
          background: #f8f9fa;
        }

        .btn-sm {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover {
          background: #218838;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
          width: 100%;
          background: transparent;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e9ecef;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          background-color: #f8f9fa;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #495057;
        }

        .stat-content h3 {
          margin: 0;
          font-size: 1.5rem;
          color: #495057;
          font-weight: 600;
        }

        .stat-content p {
          margin: 0;
          color: #6c757d;
          font-size: 0.875rem;
        }

        .stat-trend {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #6c757d;
        }

        /* Recent Activity */
        .recent-activity {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          border: 1px solid #e9ecef;
        }

        .recent-activity h3 {
          margin: 0 0 1rem 0;
          color: #495057;
          font-size: 1.125rem;
        }

        .activity-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background: #f8f9fa;
        }

        .activity-icon {
          width: 32px;
          height: 32px;
          background-color: #e9ecef;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6c757d;
        }

        .activity-content {
          flex: 1;
        }

        .activity-content p {
          margin: 0 0 0.25rem 0;
          color: #495057;
          font-size: 0.875rem;
        }

        .activity-time {
          font-size: 0.75rem;
          color: #6c757d;
        }

        .no-activity {
          text-align: center;
          padding: 2rem;
          color: #6c757d;
        }


        .error-banner {
          background: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 2rem;
          color: #721c24;
        }

        /* Overview Section */
        .overview-section {
          width: 100%;
          background: transparent;
        }

        .welcome-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          border: 1px solid #e9ecef;
        }

        .welcome-card h2 {
          margin: 0 0 0.5rem 0;
          color: #495057;
          font-size: 1.75rem;
        }

        .welcome-card p {
          margin: 0;
          color: #6c757d;
          font-size: 1rem;
        }

        .quick-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 2rem;
          width: 100%;
          background: transparent;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s ease;
          text-decoration: none;
          font-size: 0.875rem;
        }

        .btn-primary {
          background: #495057;
          color: white;
        }

        .btn-primary:hover {
          background: #343a40;
        }

        .btn-secondary {
          background: white;
          color: #495057;
          border: 1px solid #e9ecef;
        }

        .btn-secondary:hover {
          background: #f8f9fa;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover {
          background: #218838;
        }

        .btn-danger {
          background: #dc3545;
          color: white;
        }

        .btn-danger:hover {
          background: #c82333;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
          width: 100%;
          background: transparent;
        }

        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e9ecef;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          background-color: #f8f9fa;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #495057;
        }

        .stat-content h3 {
          margin: 0;
          font-size: 1.5rem;
          color: #495057;
          font-weight: 600;
        }

        .stat-content p {
          margin: 0;
          color: #6c757d;
          font-size: 0.875rem;
        }

        /* Section Styles */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          width: 100%;
          background: transparent;
          border-bottom: 2px solid #B9B28A;
          padding-bottom: 1rem;
        }

        .section-header h2 {
          margin: 0;
          color: #495057;
          font-size: 1.5rem;
          font-weight: 600;
          border: none;
          border-bottom: none;
        }

        .section-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #6c757d;
        }

        .empty-state h3 {
          margin: 1rem 0 0.5rem 0;
          color: #495057;
        }

        /* Course Cards */
        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .course-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e9ecef;
          transition: all 0.2s ease;
        }

        .course-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .course-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 1rem;
        }

        .course-header h3 {
          margin: 0;
          color: #495057;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .course-code {
          background: #f8f9fa;
          color: #495057;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .course-details {
          margin-bottom: 1.5rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .detail-item .label {
          color: #6c757d;
          font-size: 0.875rem;
        }

        .detail-item .value {
          color: #495057;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .join-code {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          color: #6c757d;
        }

        .copy-btn:hover {
          color: #495057;
        }

        .course-actions {
          display: flex;
          gap: 0.75rem;
        }

        /* Pending Courses */
        .pending-section {
          margin-top: 3rem;
        }

        .pending-section h3 {
          color: #495057;
          margin-bottom: 1rem;
        }

        .pending-courses {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pending-course-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background: #fff8e1;
        }

        .course-info h4 {
          margin: 0 0 0.25rem 0;
          color: #495057;
        }

        .course-info p {
          margin: 0;
          color: #6c757d;
          font-size: 0.875rem;
        }

        .pending-date {
          font-size: 0.75rem;
          color: #6c757d;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status.pending {
          background: #fff3cd;
          color: #856404;
        }

        /* Requests */
        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .request-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          background: white;
        }

        .request-info h4 {
          margin: 0 0 0.5rem 0;
          color: #495057;
        }

        .request-info p {
          margin: 0.25rem 0;
          color: #6c757d;
          font-size: 0.875rem;
        }

        .request-date {
          font-size: 0.75rem;
          color: #6c757d;
        }

        .request-actions {
          display: flex;
          gap: 0.75rem;
        }

        .requests-section {
          padding: 2rem;
          width: 100%;
          position: relative;
          overflow: visible;
        }

        .requests-section > *:not(.section-aurora-background) {
          position: relative;
          z-index: 1;
        }

        .requests-two-column-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          width: 100%;
        }

        .request-column {
          display: flex;
          flex-direction: column;
        }

        .request-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(225, 117, 100, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 1024px) {
          .requests-two-column-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(5px);
        }

        .modal-content {
          background: rgba(9, 18, 44, 0.95) !important;
          border-radius: 16px !important;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
          border: 2px solid rgba(135, 35, 65, 0.4) !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(20px) !important;
          display: flex !important;
          flex-direction: column !important;
        }

        .modal-content.large {
          max-width: 700px;
        }

        .profile-modal {
          max-width: 700px !important;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem !important;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1) !important;
          background: rgba(9, 18, 44, 0.98) !important;
          flex-shrink: 0;
        }

        .modal-header h2 {
          margin: 0 !important;
          color: #FFFFFF !important;
          font-weight: 700 !important;
          font-size: 1.5rem !important;
        }

        .close-btn {
          background: rgba(255, 255, 255, 0.1) !important;
          border: none !important;
          font-size: 1.5rem !important;
          cursor: pointer !important;
          color: #FFFFFF !important;
          width: 36px !important;
          height: 36px !important;
          border-radius: 8px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.3s ease !important;
        }

        .close-btn:hover {
          background: rgba(225, 117, 100, 0.3) !important;
          transform: scale(1.05) !important;
        }

        .modal-body {
          padding: 1.5rem !important;
          background: transparent !important;
          flex: 1;
          overflow-y: auto;
        }

        .profile-modal-body {
          padding: 2rem !important;
          overflow-y: auto !important;
          flex: 1 !important;
          background: transparent !important;
        }

        .profile-modal select {
          color: #FFFFFF !important;
        }

        .profile-modal select option {
          background: rgba(9, 18, 44, 0.95) !important;
          color: #FFFFFF !important;
        }

        .profile-modal-header {
          display: flex !important;
          align-items: center !important;
          gap: 1.5rem !important;
          padding-bottom: 2rem !important;
          margin-bottom: 2rem !important;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1) !important;
        }

        .profile-modal-avatar {
          width: 100px !important;
          height: 100px !important;
          border-radius: 50% !important;
          background: linear-gradient(135deg, #872341 0%, #BE3144 100%) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: #FFFFFF !important;
          overflow: hidden !important;
          flex-shrink: 0 !important;
        }

        .profile-modal-img {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
        }

        .profile-modal-user-info h3 {
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          color: #FFFFFF !important;
          margin: 0 0 0.5rem 0 !important;
        }

        .profile-modal-user-info p {
          font-size: 0.95rem !important;
          color: rgba(255, 255, 255, 0.7) !important;
          margin: 0 !important;
        }

        .profile-form-grid {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 1.5rem !important;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group {
          margin-bottom: 0 !important;
        }

        .form-group-full {
          grid-column: 1 / -1 !important;
        }

        .form-group label {
          display: block !important;
          margin-bottom: 0.5rem !important;
          font-weight: 600 !important;
          color: rgba(255, 255, 255, 0.9) !important;
          font-size: 0.9rem !important;
        }

        .form-group label .required {
          color: #E17564 !important;
          margin-left: 0.25rem !important;
        }

        .form-input,
        .form-textarea {
          width: 100% !important;
          padding: 0.875rem !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 8px !important;
          font-size: 0.9rem !important;
          transition: background-color 0.2s ease !important;
          box-sizing: border-box !important;
          background: rgba(255, 255, 255, 0.1) !important;
          color: #FFFFFF !important;
        }

        .form-input option {
          background: rgba(9, 18, 44, 0.95) !important;
          color: #FFFFFF !important;
        }

        .form-input option:checked {
          background: linear-gradient(#872341, #872341) !important;
        }

        .form-input:focus {
          outline: none !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          background: rgba(255, 255, 255, 0.15) !important;
          box-shadow: none !important;
        }

        .form-textarea:focus {
          outline: none !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
          background: rgba(255, 255, 255, 0.15) !important;
          box-shadow: none !important;
        }

        .form-input:disabled {
          background: rgba(255, 255, 255, 0.05) !important;
          cursor: not-allowed !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.5) !important;
        }

        .form-input:read-only {
          background: rgba(255, 255, 255, 0.05) !important;
          cursor: default !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .form-input:read-only:focus {
          box-shadow: none !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }

        .modal-actions {
          display: flex !important;
          gap: 1rem !important;
          justify-content: flex-end !important;
          margin-top: 1.5rem !important;
        }

        .modal-actions-full {
          grid-column: 1 / -1 !important;
          margin-top: 2rem !important;
          padding-top: 2rem !important;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .students-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .student-item {
          padding: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
        }

        .student-info h4 {
          margin: 0 0 0.5rem 0;
          color: #FFFFFF;
        }

        .student-info p {
          margin: 0.25rem 0;
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .enrollment-date {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.6);
        }

        /* Responsive Design */
        @media (min-width: 768px) {
          .sidebar {
            position: static;
            left: 0;
          }
          
          .main-content {
            margin-left: 0;
          }
          
          .menu-btn {
            display: none;
          }
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .courses-grid {
            grid-template-columns: 1fr;
          }

          .request-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .quick-actions {
            flex-direction: column;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }
        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .content-area {
            padding: 1rem;
          }
        }

        /* Section Styles */
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          width: 100%;
          background: transparent;
          border-bottom: 2px solid #B9B28A;
          padding-bottom: 1rem;
        }

        .section-header h2 {
          margin: 0;
          color: #495057;
          font-size: 1.5rem;
          font-weight: 600;
          border: none;
          border-bottom: none;
        }

        .section-actions {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #6c757d;
        }

        .empty-state h3 {
          margin: 1rem 0 0.5rem 0;
          color: #495057;
        }

        /* Course Cards */
        .courses-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .course-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e9ecef;
          transition: all 0.2s ease;
        }

        .course-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .course-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 1rem;
        }

        .course-header h3 {
          margin: 0;
          color: #495057;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .course-code {
          background: #f8f9fa;
          color: #495057;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .course-details {
          margin-bottom: 1.5rem;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .detail-item .label {
          color: #6c757d;
          font-size: 0.875rem;
        }

        .detail-item .value {
          color: #495057;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .join-code {
          font-family: 'Courier New', monospace;
          font-weight: 600;
          font-size: 0.875rem;
        }

        .copy-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 2px;
          color: #6c757d;
        }

        .copy-btn:hover {
          color: #495057;
        }

        .course-actions {
          display: flex;
          gap: 0.75rem;
        }

        /* Pending Courses */
        .pending-section {
          margin-top: 3rem;
        }

        .pending-section h3 {
          color: #495057;
          margin-bottom: 1rem;
        }

        .pending-courses {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pending-course-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          background: #fff8e1;
        }

        .course-info h4 {
          margin: 0 0 0.25rem 0;
          color: #495057;
        }

        .course-info p {
          margin: 0;
          color: #6c757d;
          font-size: 0.875rem;
        }

        .pending-date {
          font-size: 0.75rem;
          color: #6c757d;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status.pending {
          background: #fff3cd;
          color: #856404;
        }

        /* Requests */
        .requests-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .request-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.5rem;
          border: 1px solid #e9ecef;
          border-radius: 12px;
          background: white;
        }

        .request-info h4 {
          margin: 0 0 0.5rem 0;
          color: #495057;
        }

        .request-info p {
          margin: 0.25rem 0;
          color: #6c757d;
          font-size: 0.875rem;
        }

        .request-date {
          font-size: 0.75rem;
          color: #6c757d;
        }

        .request-actions {
          display: flex;
          gap: 0.75rem;
        }


        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
          gap: 2rem;
          margin-bottom: 2rem;
        }

        .analytics-card {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 16px rgba(80, 75, 56, 0.08);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .analytics-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(80, 75, 56, 0.12);
        }

        .analytics-card h3 {
          margin: 0 0 1.5rem 0;
          color: #504B38;
          font-size: 1.25rem;
          font-weight: 700;
        }

        .analytics-content {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .analytics-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem;
          background: rgba(80, 75, 56, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(80, 75, 56, 0.1);
        }

        .analytics-label {
          color: #6c757d;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .analytics-value {
          color: #504B38;
          font-size: 1.25rem;
          font-weight: 700;
        }

        /* Section Title */
        .section-title {
          margin: 0 0 2rem 0;
          color: #504B38;
          font-size: 2rem;
          font-weight: 700;
          text-align: center;
          border: none;
          border-bottom: none;
        }

        /* Empty Courses */
        .empty-courses {
          grid-column: 1 / -1;
          text-align: center;
          padding: 4rem 2rem;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 20px;
          border: 2px dashed rgba(80, 75, 56, 0.3);
          margin-top: 2rem;
        }

        .empty-icon {
          margin-bottom: 1.5rem;
          color: #6c757d;
        }

        .empty-courses h3 {
          margin: 0 0 1rem 0;
          color: #504B38;
          font-size: 1.5rem;
          font-weight: 700;
          font-family: 'Georgia', serif;
        }

        .empty-courses p {
          margin: 0 0 2rem 0;
          color: #6c757d;
          font-size: 1rem;
          line-height: 1.5;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .nav-container {
            padding: 0 1rem;
          }

          .nav-left {
            gap: 1rem;
          }

          .nav-links {
            display: none;
          }

          .mobile-menu-btn {
            display: block;
          }

          .mobile-nav {
            display: block;
          }

          .content-area {
            padding: 1rem;
          }

          .welcome-header-with-stats {
            flex-direction: column;
            gap: 1.5rem;
            align-items: center;
          }

          .welcome-content {
            min-width: auto;
            max-width: 100%;
            text-align: center;
          }

          .vertical-stats {
            gap: 1rem;
            min-width: auto;
            width: 100%;
            justify-content: space-between;
          }

          .stat-tube {
            min-width: 80px;
            max-width: 120px;
            padding: 1rem 0.5rem;
          }

          .welcome-title {
            font-size: 2rem;
          }

          .welcome-description {
            font-size: 1rem;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .courses-grid {
            grid-template-columns: 1fr;
          }

          .request-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .quick-actions {
            flex-direction: column;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

        }

        @media (max-width: 480px) {
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .content-area {
            padding: 0.5rem;
          }

          .nav-container {
            height: 56px;
          }

          .main-content {
            min-height: calc(100vh - 56px);
          }

          .vertical-stats {
            gap: 0.5rem;
          }

          .stat-tube {
            min-width: 70px;
            max-width: 100px;
            padding: 0.75rem 0.25rem;
          }

          .welcome-title {
            font-size: 1.75rem;
          }

          .welcome-description {
            font-size: 0.9rem;
          }

          .welcome-actions {
            flex-direction: column;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ProfessorDashboard;