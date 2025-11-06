import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, User, LogOut, Plus, Search, Users, Clock, 
  CheckCircle, XCircle, Edit, Eye, Copy, Calendar, 
  Menu, X, Home, BarChart3, FileText, ChevronRight,
  TrendingUp, Activity, Star, Calendar as CalendarIcon,
  MessageSquare, AlertCircle, CheckCircle2, Clock3, Award, Target,
  Bookmark, GraduationCap, ClipboardList, UserCheck
} from 'lucide-react';
import { Squares } from './ui/squares-background';
import Aurora from './Aurora';

const StudentDashboard = () => {
  const [user, setUser] = useState(null);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showStudentProfileDropdown, setShowStudentProfileDropdown] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    studentNumber: '',
    program: ''
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/signin');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.userType !== 'student') {
      navigate('/dashboard');
      return;
    }

    setUser(parsedUser);
    fetchStudentData();
  }, [navigate]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showProfileEdit || showJoinModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showProfileEdit, showJoinModal]);

  const fetchStudentData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch user profile from database (includes profile_image_url)
      const profileResponse = await fetch('/api/student/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUser(profileData); // Update user state with fresh data from database
        // Update localStorage with fresh profile data
        localStorage.setItem('user', JSON.stringify({ ...profileData, userType: 'student' }));
      }
      
      // Fetch enrolled courses
      const coursesResponse = await fetch('/api/student/courses', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (coursesResponse.ok) {
        const coursesList = await coursesResponse.json();
        
        // Fetch detailed info with professor data for each course
        const coursesWithProfessor = await Promise.all(
          (coursesList || []).map(async (course) => {
            try {
              const infoResponse = await fetch(`/api/student/course/${course.id}/info`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (infoResponse.ok) {
                return await infoResponse.json();
              }
            } catch (e) {
              console.error('Error fetching course info:', e);
            }
            return course;
          })
        );
        
        setEnrolledCourses(coursesWithProfessor);
      }

      // Fetch join requests
      const requestsResponse = await fetch('/api/student/join-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (requestsResponse.ok) {
        const requests = await requestsResponse.json();
        setJoinRequests(requests);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCourse = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/student/join-course', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          joinCode: joinCode.trim().toUpperCase(),
          message: joinMessage
        })
      });

      if (response.ok) {
        alert('Join request sent successfully! Please wait for professor approval.');
        setShowJoinModal(false);
        setJoinCode('');
        setJoinMessage('');
        fetchStudentData(); // Refresh data
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error joining course:', error);
      alert('Failed to send join request');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleProfileEdit = () => {
    setShowStudentProfileDropdown(false);
    setProfileForm({
      firstName: user?.first_name || user?.firstName || '',
      lastName: user?.last_name || user?.lastName || '',
      email: user?.email || '',
      studentNumber: user?.student_number || user?.studentNumber || '',
      program: user?.program || ''
    });
    setIsEditingProfile(false); // Start in view mode
    setShowProfileEdit(true);
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdatingProfile(true);
    
    try {
      const token = localStorage.getItem('token');
      // Only send firstName and lastName - other fields are read-only
      const response = await fetch('/api/student/profile', {
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
        localStorage.setItem('user', JSON.stringify({ ...updatedUser, userType: 'student' }));
        setIsEditingProfile(false);
        setShowProfileEdit(false);
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

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const toggleStudentProfileDropdown = () => {
    setShowStudentProfileDropdown(!showStudentProfileDropdown);
  };

  const getTotalCourses = () => {
    return enrolledCourses.length;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
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
            </div>
          </div>

          {/* Right side - Profile and Actions */}
          <div className="nav-right">
            {/* Student Profile Section */}
            <div id="student-profile-wrapper" className="student-profile-wrapper">
              <button 
                id="student-profile-trigger-btn"
                className="student-profile-trigger-btn" 
                onClick={toggleStudentProfileDropdown}
              >
                <div id="student-profile-avatar-mini" className="student-profile-avatar-mini">
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
              
              {showStudentProfileDropdown && (
                <div id="student-profile-dropdown-menu" className="student-profile-dropdown-menu">
                  <div id="student-profile-dropdown-actions" className="student-profile-dropdown-actions">
                    <button 
                      className="student-profile-action-item" 
                      onClick={() => {
                        handleProfileEdit();
                        setShowStudentProfileDropdown(false);
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
                  <h1 className="welcome-title">Welcome back, {user?.first_name}!</h1>
                  <p className="welcome-description">Ready to continue your academic journey? Let's see what's new today.</p>
                  <div className="welcome-actions">
            <button 
              className="btn btn-primary"
              onClick={() => setShowJoinModal(true)}
            >
              <Plus size={16} />
              Join Course
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
                <h3>{getTotalCourses()}</h3>
                      <p>Active Courses</p>
                    </div>
              </div>
                  <div className="stat-tube">
                  <div className="stat-icon">
                      <Clock size={20} />
              </div>
                  <div className="stat-content">
                <h3>{joinRequests.filter(req => req.status === 'pending').length}</h3>
                <p>Pending Requests</p>
                    </div>
              </div>
                  <div className="stat-tube">
                  <div className="stat-icon">
                      <Award size={20} />
              </div>
                  <div className="stat-content">
                      <h3>{joinRequests.filter(req => req.status === 'approved').length}</h3>
                      <p>Completed</p>
                    </div>
              </div>
            </div>
              </div>
              <br></br>
              {/* Courses Section */}
              <div className="courses-section">
                <h2 className="section-title">My Courses</h2>
                <div className="courses-grid">
                  {enrolledCourses.map(course => (
                    <div 
                      key={course.id} 
                      className="course-card"
                      onClick={() => navigate(`/course/student/${course.id}`)}
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
                            <span className="detail-label">Professor</span>
                            <span className="detail-value">{course.professoraccounts ? `${course.professoraccounts.first_name} ${course.professoraccounts.last_name}` : course.professor_name || 'TBA'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Section</span>
                            <span className="detail-value">{course.section}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Join Code</span>
                            <span className="detail-value" style={{ color: 'white' }}>{course.join_code}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Semester</span>
                            <span className="detail-value">{course.semester} {course.school_year}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {enrolledCourses.length === 0 && (
                    <div className="empty-courses">
                      <BookOpen size={48} />
                      <h3>No courses yet</h3>
                      <p>Join a course to get started</p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowJoinModal(true)}
                      >
                        <Plus size={16} />
                        Join Course
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
                  
                  <h2 className="section-title">Active Projects</h2>
                  <div className="projects-list">
                  {enrolledCourses.slice(0, 3).map(course => (
                      <div key={course.id} className="project-pill">
                        <div className="project-icon">
                          <FileText size={20} />
                      </div>
                        <div className="project-info">
                          <h4>{course.course_name}</h4>
                          <p className="project-details">
                            <span className="phase-info">Phase 2: Design</span>
                            <span className="due-date">Due: Dec 15, 2024</span>
                          </p>
                        </div>
                        <div className="phase-progress">
                          <div className="phase-bar">
                            <div className="phase-fill" style={{width: '50%'}}></div>
                          </div>
                          <div className="phase-percentage">50%</div>
                      </div>
                      <button 
                          className="project-action-btn"
                        onClick={() => navigate(`/course/student/${course.id}`)}
                      >
                          <ChevronRight size={16} />
                      </button>
                    </div>
                  ))}
                  {enrolledCourses.length === 0 && (
                      <div className="empty-state">
                        <FileText size={48} />
                        <h3>No active projects</h3>
                        <p>Join a course to see your projects here</p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => setShowJoinModal(true)}
                        >
                          <Plus size={16} />
                          Join Course
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
                        <h4>Task Completed</h4>
                        <p>Submitted final report for ITCP311</p>
                        <span className="activity-time">2 hours ago</span>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon">
                        <MessageSquare size={20} />
                      </div>
                      <div className="activity-content">
                        <h4>New Comment</h4>
                        <p>Professor commented on your submission</p>
                        <span className="activity-time">5 hours ago</span>
                      </div>
                    </div>
                    <div className="activity-item">
                      <div className="activity-icon">
                        <Clock size={20} />
                      </div>
                      <div className="activity-content">
                        <h4>Deadline Reminder</h4>
                        <p>Project milestone due in 2 days</p>
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
                  onClick={() => setShowJoinModal(true)}
                >
                  <Plus size={16} />
                  Join Course
                </button>
              </div>

            {enrolledCourses.length === 0 ? (
              <div className="empty-state">
                  <BookOpen size={64} />
                <h3>No courses enrolled</h3>
                <p>Join your first course using a course code from your professor</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowJoinModal(true)}
                >
                  Join Course
                </button>
              </div>
            ) : (
              <div className="courses-grid">
                {enrolledCourses.map(course => (
                  <div key={course.id} className="course-card">
                    {/* Crosshair Corners */}
                    <div className="course-crosshair-corner course-crosshair-top-left"></div>
                    <div className="course-crosshair-corner course-crosshair-top-right"></div>
                    <div className="course-crosshair-corner course-crosshair-bottom-left"></div>
                    <div className="course-crosshair-corner course-crosshair-bottom-right"></div>

                    <div className="course-header">
                        <div className="course-title-section">
                          <h3 className="course-title">{course.course_name}</h3>
                          <div className="course-code-badge" style={{ color: 'white' }}>{course.course_code}</div>
                    </div>
                        <div className="course-status">
                          <span className="status-badge active">
                            <div className="status-dot"></div>
                            Active
                          </span>
                        </div>
                        </div>
                      
                      <div className="course-info-grid">
                        <div className="info-item">
                          <div className="info-label" style={{ color: 'white !important' }}>Professor</div>
                          <div className="student-course-white-text">
                            {(() => {
                              const profName = course.professoraccounts 
                                ? `${course.professoraccounts.first_name} ${course.professoraccounts.last_name}` 
                                : (course.professor_name || 'TBA');
                              console.log('Course:', course.course_code, 'Prof:', profName, 'professoraccounts:', course.professoraccounts);
                              return profName;
                            })()}
                          </div>
                        </div>
                        <div className="info-item">
                          <div className="info-label" style={{ color: 'white !important' }}>Section</div>
                          <div className="student-course-white-text">{course.section}</div>
                        </div>
                        <div className="info-item">
                          <div className="info-label" style={{ color: 'white !important' }}>Join Code</div>
                          <div className="student-course-white-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{course.join_code || 'N/A'}</span>
                            <button 
                              style={{ 
                                background: 'none', 
                                border: 'none', 
                                color: 'white !important', 
                                cursor: 'pointer', 
                                padding: '0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'opacity 0.2s'
                              }}
                              onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                              onMouseLeave={(e) => e.target.style.opacity = '1'}
                              onClick={() => navigator.clipboard.writeText(course.join_code || 'N/A')}
                              title="Copy join code"
                            >
                              <Copy size={16} />
                            </button>
                          </div>
                        </div>
                        <div className="info-item">
                          <div className="info-label" style={{ color: 'white !important' }}>Semester</div>
                          <div className="student-course-white-text">{course.semester} {course.school_year}</div>
                    </div>
                      </div>
                      
<div className="course-actions">
<button 
                          className="btn btn-primary course-enter-btn"
  onClick={() => navigate(`/course/student/${course.id}`)}
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

          {/* Progress Section */}
          {activeSection === 'progress' && (
            <div className="progress-section">
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
                <h2>Academic Progress</h2>
              </div>
              
              <div className="progress-grid">
                <div className="progress-card">
                  <div className="progress-header">
                    <h3>Overall Performance</h3>
                    <span className="progress-percentage">85%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width: '85%'}}></div>
                  </div>
                  <div className="progress-details">
                    <div className="progress-item">
                      <span className="label">Completed Assignments:</span>
                      <span className="value">24/28</span>
                    </div>
                    <div className="progress-item">
                      <span className="label">Average Grade:</span>
                      <span className="value">88.5%</span>
                    </div>
                  </div>
                </div>

                <div className="progress-card">
                  <div className="progress-header">
                    <h3>Course Completion</h3>
                    <span className="progress-percentage">75%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width: '75%'}}></div>
                  </div>
                  <div className="progress-details">
                    <div className="progress-item">
                      <span className="label">Courses Completed:</span>
                      <span className="value">3/4</span>
                    </div>
                    <div className="progress-item">
                      <span className="label">Credits Earned:</span>
                      <span className="value">9/12</span>
                    </div>
                  </div>
                </div>

                <div className="progress-card">
                  <div className="progress-header">
                    <h3>Attendance Rate</h3>
                    <span className="progress-percentage">92%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width: '92%'}}></div>
                  </div>
                  <div className="progress-details">
                    <div className="progress-item">
                      <span className="label">Classes Attended:</span>
                      <span className="value">46/50</span>
                    </div>
                    <div className="progress-item">
                      <span className="label">Perfect Attendance:</span>
                      <span className="value">2 courses</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Requests Section */}
          {activeSection === 'requests' && (
            <div className="requests-section">
              <div className="section-header">
            <h2>Course Join Requests</h2>
              </div>

              {joinRequests.length === 0 ? (
                <div className="empty-state">
                  <MessageSquare size={64} />
                  <h3>No join requests</h3>
                  <p>You haven't sent any join requests yet</p>
                </div>
            ) : (
                <div className="requests-grid">
                {joinRequests.map(request => (
                    <div key={request.id} className="request-card">
                      <div className="request-header">
                      <h4>{request.course_name}</h4>
                    <div className="request-status">
                      {request.status === 'pending' && (
                        <span className="status pending">
                          <Clock size={16} />
                          Pending
                        </span>
                      )}
                      {request.status === 'approved' && (
                        <span className="status approved">
                          <CheckCircle size={16} />
                          Approved
                        </span>
                      )}
                      {request.status === 'rejected' && (
                        <span className="status rejected">
                          <XCircle size={16} />
                          Rejected
                        </span>
                      )}
                        </div>
                      </div>
                      <div className="request-details">
                        <p><strong>Course:</strong> {request.course_code} - {request.section}</p>
                        {request.message && <p><strong>Message:</strong> {request.message}</p>}
                        <span className="request-date">
                          Requested: {new Date(request.created_at).toLocaleDateString()}
                        </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </main>

      {/* Join Course Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="student-join-modal-title">Join Course</h2>
              <button 
                className="close-btn"
                onClick={() => setShowJoinModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleJoinCourse} className="modal-body">
              <div className="form-group">
                <label>Course Join Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  placeholder="Enter course join code"
                  required
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Message (Optional)</label>
                <textarea
                  value={joinMessage}
                  onChange={(e) => setJoinMessage(e.target.value)}
                  placeholder="Add a message for your professor"
                  className="form-textarea"
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowJoinModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile View/Edit Modal */}
      {showProfileEdit && (
        <div className="modal-overlay" onClick={() => {
          setShowProfileEdit(false);
          setIsEditingProfile(false);
        }}>
          <div className="modal-content profile-modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header - Colored bar with title and X button */}
            <div className="modal-header">
              <div className="modal-header-left">
                <h2>My Profile</h2>
              </div>
              <div className="modal-header-right">
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
                  <h3>{user?.first_name} {user?.last_name}</h3>
                  <p>{user?.student_number}</p>
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
                  <label>Student Number</label>
                  <input
                    type="text"
                    value={profileForm.studentNumber}
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
                  <label>Program</label>
                  <select
                    value={profileForm.program}
                    className="form-input"
                    disabled
                    style={{ 
                      backgroundColor: '#f3f4f6', 
                      cursor: 'not-allowed',
                      color: '#6b7280'
                    }}
                  >
                    <option value="">Select Program</option>
                    <option value="BSIT">BSIT</option>
                    <option value="BSEMC">BSEMC</option>
                    <option value="BSCS">BSCS</option>
                  </select>
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
        .student-dashboard {
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

        /* Mobile Menu */
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          color: #495057;
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
        .welcome-header {
          margin-bottom: 2rem;
        }

        .welcome-title {
          font-family: 'Georgia', serif;
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1.15;
          margin-bottom: 0.6rem;
          color: #FFFFFF !important;
          letter-spacing: -0.03em;
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

        /* Quick Stats */
        .quick-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 16px rgba(80, 75, 56, 0.08);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(80, 75, 56, 0.12);
        }

        .stat-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #BE3144, #872341);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          border: 2px solid white;
        }

        .stat-content h3 {
          margin: 0;
          font-size: 1.75rem;
          color: #09122C;
          font-weight: 700;
        }

        .stat-content p {
          margin: 0;
          color: #09122C;
          font-size: 0.9rem;
          font-weight: 500;
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

        /* Section Title */
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

        .active-projects-section .section-title {
          color: #FFFFFF !important;
        }

        .active-projects-section h2,
        .active-projects-section h3,
        .active-projects-section h4,
        .active-projects-section h5,
        .active-projects-section h6 {
          color: #FFFFFF !important;
        }

        .active-projects-section p {
          color: #E5E5CB !important;
        }

        .active-projects-section span {
          color: #E5E5CB !important;
        }

        .active-projects-section .phase-info {
          color: #FFFFFF !important;
        }

        .active-projects-section .due-date {
          color: #E5E5CB !important;
        }

        .active-projects-section .phase-percentage {
          color: #FFFFFF !important;
        }

        .active-projects-section .empty-state h3 {
          color: #FFFFFF !important;
        }

        .active-projects-section .empty-state p {
          color: #E5E5CB !important;
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
          flex-direction: column;
          gap: 0.125rem;
        }

        .phase-info {
          color: #FFFFFF;
          font-size: 0.7rem;
          font-weight: 500;
          background: rgba(225, 117, 100, 0.3);
          padding: 0.125rem 0.375rem;
          border-radius: 8px;
          display: inline-block;
          width: fit-content;
        }

        .due-date {
          color: #E5E5CB;
          font-size: 0.65rem;
          font-weight: 400;
        }

        .phase-progress {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 120px;
        }

        .phase-bar {
          flex: 1;
          height: 6px;
          background: rgba(190, 49, 68, 0.2);
          border-radius: 3px;
          overflow: hidden;
        }

        .phase-fill {
          height: 100%;
          background: linear-gradient(90deg, #E17564, #BE3144);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .phase-percentage {
          font-size: 0.7rem;
          color: #FFFFFF;
          font-weight: 600;
          min-width: 30px;
          text-align: right;
        }

        .project-action-btn {
          background: rgba(190, 49, 68, 0.2);
          border: 1px solid rgba(225, 117, 100, 0.4);
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          cursor: pointer;
          transition: all 0.3s ease;
          flex-shrink: 0;
        }

        .project-action-btn:hover {
          background: rgba(190, 49, 68, 0.4);
          border-color: #E17564;
          transform: scale(1.05);
        }

        /* Courses Section */
        .courses-section {
          margin-bottom: 2rem !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          width: 100% !important;
          padding: 0 2rem !important;
          position: relative !important;
          overflow: visible !important;
        }

        .courses-grid {
          display: grid !important;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)) !important;
          gap: 1.25rem !important;
          margin-top: 1rem !important;
          max-width: 100% !important;
          justify-content: center !important;
          justify-items: center !important;
          margin-left: auto !important;
          margin-right: auto !important;
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
          max-width: 320px !important;
          position: relative !important;
          overflow: visible !important;
        }

        .course-card:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 4px 16px rgba(225, 117, 100, 0.2) !important;
          background: #09122C !important;
          border-color: #E17564 !important;
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

        /* Section Crosshair Corners (for Active Projects & Recent Activities) */
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

        .empty-courses {
          grid-column: 1 / -1;
          text-align: center;
          padding: 3rem 2rem;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 0px;
          border: 2px dashed rgba(225, 117, 100, 0.5);
        }

        .empty-courses svg {
          color: #E17564;
          margin-bottom: 1rem;
        }

        .empty-courses h3 {
          color: #09122C;
          margin-bottom: 0.5rem;
        }

        .empty-courses p {
          color: #09122C;
          margin-bottom: 1.5rem;
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

        .recent-activities-section .section-title {
          color: #FFFFFF !important;
        }

        .recent-activities-section h2,
        .recent-activities-section h3,
        .recent-activities-section h4,
        .recent-activities-section h5,
        .recent-activities-section h6 {
          color: #FFFFFF !important;
        }

        .recent-activities-section p {
          color: #E5E5CB !important;
        }

        .recent-activities-section span {
          color: #E5E5CB !important;
        }

        .recent-activities-section .activity-time {
          color: #E5E5CB !important;
        }

        .recent-activities-section .activity-content h4 {
          color: #FFFFFF !important;
        }

        .recent-activities-section .activity-content p {
          color: #E5E5CB !important;
        }

        .activities-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          border: 1px solid rgba(225, 117, 100, 0.3);
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .activity-item:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(225, 117, 100, 0.3);
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(225, 117, 100, 0.5);
        }

        .activity-icon {
          width: 28px;
          height: 28px;
          background: linear-gradient(135deg, #BE3144, #872341);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 2px 6px rgba(190, 49, 68, 0.4);
          flex-shrink: 0;
        }

        .activity-content h4 {
          margin: 0 0 0.125rem 0;
          color: #FFFFFF;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .activity-content p {
          margin: 0 0 0.125rem 0;
          color: #E5E5CB;
          font-size: 0.7rem;
          line-height: 1.3;
        }

        .activity-time {
          font-size: 0.65rem;
          color: #E5E5CB;
        }

        .section-header {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin-bottom: 1.5rem !important;
          gap: 2rem !important;
          flex-wrap: wrap !important;
          width: 100% !important;
        }

        .section-header h2 {
          margin: 0 !important;
          color: #FFFFFF !important;
          font-size: 1.5rem !important;
          font-weight: 700 !important;
          text-align: center !important;
          flex: 0 0 100% !important;
          padding-bottom: 0.5rem !important;
          border-bottom: 1px solid #FFFFFF !important;
          width: fit-content !important;
          margin-left: auto !important;
          margin-right: auto !important;
        }

        .activity-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .activity-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1.25rem;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          transition: all 0.3s ease;
        }

        .activity-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(80, 75, 56, 0.1);
        }

        .activity-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #BE3144, #872341);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .activity-content {
          flex: 1;
        }

        .activity-content h4 {
          margin: 0 0 0.25rem 0;
          color: #FFFFFF;
          font-size: 1rem;
          font-weight: 600;
        }

        .activity-content p {
          margin: 0 0 0.25rem 0;
          color: #E5E5CB;
          font-size: 0.85rem;
        }

        .activity-time {
          font-size: 0.75rem;
          color: #E5E5CB;
        }

        .no-activity {
          text-align: center;
          padding: 2rem;
          color: #6c757d;
        }

        /* Section Styles */
        .section-header {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin-bottom: 2rem !important;
          width: 100% !important;
          background: transparent !important;
          gap: 2rem !important;
          flex-wrap: wrap !important;
        }

        .section-header h2 {
          margin: 0 !important;
          color: #FFFFFF !important;
          font-size: 1.5rem !important;
          font-weight: 600 !important;
          text-align: center !important;
          flex: 0 0 100% !important;
        }

        .empty-state {
          text-align: center;
          padding: 4rem 2rem;
          color: #E5E5CB;
        }

        .empty-state h3 {
          margin: 1rem 0 0.5rem 0;
          color: #FFFFFF;
        }



        .status-badge {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .status-badge.active {
          background: rgba(40, 167, 69, 0.15);
          color: #28a745;
          border: 1px solid rgba(40, 167, 69, 0.3);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          background: #28a745;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .course-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin-bottom: 2rem;
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

        .info-value.join-code {
          font-family: 'Courier New', monospace;
          background: rgba(225, 117, 100, 0.2);
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          border: 1px solid rgba(225, 117, 100, 0.4);
        }

        /* Progress Section */
        .progress-section {
          padding: 0 2rem;
          position: relative;
          overflow: visible;
        }

        .progress-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 1.5rem;
        }

        .progress-card {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 16px rgba(80, 75, 56, 0.08);
          backdrop-filter: blur(10px);
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .progress-header h3 {
          margin: 0;
          color: #09122C;
          font-size: 1.125rem;
          font-weight: 700;
        }

        .progress-percentage {
          color: #BE3144;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(190, 49, 68, 0.2);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 1rem;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(135deg, #E17564, #BE3144);
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-details {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .progress-item {
          display: flex;
          justify-content: space-between;
        }

        .progress-item .label {
          color: #6c757d;
          font-size: 0.875rem;
        }

        .progress-item .value {
          color: #09122C;
          font-size: 0.875rem;
          font-weight: 600;
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

        /* Requests */
        .requests-section {
          padding: 0 2rem;
        }

        .requests-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 1.5rem;
        }

        .request-card {
          background: rgba(255, 255, 255, 0.9);
          border-radius: 16px;
          padding: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 16px rgba(80, 75, 56, 0.08);
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .request-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(80, 75, 56, 0.12);
        }

        .request-header {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 1rem;
        }

        .request-header h4 {
          margin: 0;
          color: #09122C;
          font-size: 1.125rem;
          font-weight: 700;
        }

        .request-details p {
          margin: 0.25rem 0;
          color: #09122C;
          font-size: 0.875rem;
        }

        .request-date {
          font-size: 0.75rem;
          color: #09122C;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.25rem 0.75rem;
          border-radius: 8px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .status.pending {
          background: rgba(255, 193, 7, 0.1);
          color: #ffc107;
        }

        .status.approved {
          background: rgba(40, 167, 69, 0.1);
          color: #28a745;
        }

        .status.rejected {
          background: rgba(220, 53, 69, 0.1);
          color: #dc3545;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          backdrop-filter: blur(5px);
          overflow-y: auto;
        }

        .modal-content {
          background: rgba(9, 18, 44, 0.95) !important;
          border-radius: 16px !important;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(135, 35, 65, 0.4) !important;
          max-width: 700px;
          width: 90%;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.9rem 1.2rem;
          border-bottom: none !important;
          background: linear-gradient(135deg, #872341 0%, #BE3144 100%);
        }

        .modal-header-left {
          display: flex;
          align-items: center;
        }

        .modal-header-left h2 {
          margin: 0;
          color: white !important;
          font-size: 1.125rem;
          font-weight: 600;
        }

        .modal-header-right {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .close-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          background: #ef4444;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          background: #dc2626;
        }

        .modal-body {
          padding: 1.5rem;
          flex: 1;
          overflow-y: auto;
        }

        .profile-modal {
          max-width: 700px;
        }

        .profile-modal-body {
          padding: 2rem;
          overflow-y: auto;
          flex: 1;
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
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding-bottom: 2rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1) !important;
        }

        .profile-modal-avatar {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #872341 0%, #BE3144 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          overflow: hidden;
          flex-shrink: 0;
        }

        .profile-modal-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-modal-user-info h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #FFFFFF !important;
          margin: 0 0 0.5rem 0;
        }

        .profile-modal-user-info p {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.7) !important;
          margin: 0;
        }

        .profile-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .form-group {
          margin-bottom: 0;
        }

        .form-group-full {
          grid-column: 1 / -1;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9) !important;
          font-size: 0.9rem;
        }

        .form-input,
        .form-textarea {
          width: 100%;
          padding: 0.875rem;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: all 0.2s ease;
          box-sizing: border-box;
          background: rgba(255, 255, 255, 0.1) !important;
          color: #FFFFFF !important;
        }

        .form-input:read-only {
          background: rgba(255, 255, 255, 0.05) !important;
          cursor: default;
          border-color: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .form-input:disabled {
          background: rgba(255, 255, 255, 0.05) !important;
          cursor: not-allowed;
          border-color: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.5) !important;
        }

        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #E17564;
          background: rgba(255, 255, 255, 0.15);
          box-shadow: 0 0 0 3px rgba(225, 117, 100, 0.2);
        }

        .form-input:read-only:focus {
          box-shadow: none;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          margin-top: 1.5rem;
        }

        .modal-actions-full {
          grid-column: 1 / -1;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
        }

        .btn-primary {
          background: linear-gradient(135deg, #872341 0%, #BE3144 100%);
          color: #FFFFFF;
        }

        .btn-primary:hover:not(:disabled) {
          background: linear-gradient(135deg, #BE3144 0%, #872341 100%);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(225, 117, 100, 0.4);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-outline {
          background: rgba(255, 255, 255, 0.1) !important;
          color: #FFFFFF !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        .btn-outline:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
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

          .profile-form-grid {
            grid-template-columns: 1fr;
          }

          .profile-modal-header {
            flex-direction: column;
            text-align: center;
          }

          .modal-content {
            margin: 1rem;
            max-width: calc(100% - 2rem);
          }
        }

          .quick-actions {
            flex-direction: column;
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

          .nav-container {
            height: 56px;
          }

          .main-content {
            min-height: calc(100vh - 56px);
          }
        }
      `}</style>
    </div>
  );
};

export default StudentDashboard;
