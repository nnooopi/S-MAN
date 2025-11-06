import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, User, LogOut, Bell, Settings, Users, UserCheck, UserX, Eye, Download, FileText, Image, 
  GraduationCap, Calendar, MapPin, Clock, Home, Menu, X, AlertCircle, CheckCircle2
} from 'lucide-react';
import { Squares } from './ui/squares-background';
import Aurora from './Aurora';

const AdminDashboard = () => {
  const [user, setUser] = useState(null);
  const [pendingStudents, setPendingStudents] = useState([]);
  const [pendingProfessors, setPendingProfessors] = useState([]);
  const [pendingCourses, setPendingCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('students');
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAdminProfileDropdown, setShowAdminProfileDropdown] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      navigate('/signin');
      return;
    }

    try {
      const user = JSON.parse(userData);
      if (user.userType !== 'admin') {
        navigate('/dashboard');
        return;
      }

      setUser(user);
      fetchAllPendingData();
    } catch (parseError) {
      console.error('Error parsing user data:', parseError);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/signin');
    }
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading) {
        fetchAllPendingData(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loading]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showModal || showCourseModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showModal, showCourseModal]);

  const fetchAllPendingData = async (forceRefresh = false) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/signin');
        return;
      }
      
      const cacheParam = forceRefresh ? `?_t=${Date.now()}` : '';
      
      const [studentsResponse, professorsResponse, coursesResponse] = await Promise.all([
        fetch(`/api/admin/pending-students${cacheParam}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': forceRefresh ? 'no-cache' : 'default'
          }
        }),
        fetch(`/api/admin/pending-professors${cacheParam}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': forceRefresh ? 'no-cache' : 'default'
          }
        }),
        fetch(`/api/admin/pending-courses${cacheParam}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Cache-Control': forceRefresh ? 'no-cache' : 'default'
          }
        })
      ]);
      
      if (studentsResponse.status === 401 || studentsResponse.status === 403 ||
          professorsResponse.status === 401 || professorsResponse.status === 403 ||
          coursesResponse.status === 401 || coursesResponse.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/signin');
        return;
      }
      
      if (studentsResponse.ok) {
        const students = await studentsResponse.json();
        setPendingStudents(students || []);
      } else {
        const errorText = await studentsResponse.text();
        setError('Failed to fetch pending students: ' + errorText);
      }

      if (professorsResponse.ok) {
        const professors = await professorsResponse.json();
        setPendingProfessors(professors || []);
      } else {
        const errorText = await professorsResponse.text();
        setError('Failed to fetch pending professors: ' + errorText);
      }

      if (coursesResponse.ok) {
        const courses = await coursesResponse.json();
        setPendingCourses(courses || []);
        setError('');
      } else {
        const errorText = await coursesResponse.text();
        setError('Failed to fetch pending courses: ' + errorText);
      }

    } catch (error) {
      console.error('Error fetching pending data:', error);
      setError('Network error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (accountId, type) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/approve-${type}/${accountId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (type === 'course') {
          alert(`Course approved successfully! Join code: ${result.joinCode}`);
        } else {
          alert(`${type} account approved successfully!`);
        }
        fetchAllPendingData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error approving:', error);
      alert('Error approving ' + type);
    }
  };

  const handleReject = async (accountId, type) => {
    const reason = prompt('Enter rejection reason (optional):');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/reject-${type}/${accountId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });

      if (response.ok) {
        alert(`${type} ${type === 'course' ? '' : 'account '}rejected successfully!`);
        fetchAllPendingData();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('Error rejecting ' + type);
    }
  };

  const handleViewDetails = (account) => {
    setSelectedAccount(account);
    setShowModal(true);
  };

  const handleViewCourseDetails = (course) => {
    setSelectedCourse(course);
    setShowCourseModal(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setPendingStudents([]);
    setPendingProfessors([]);
    setPendingCourses([]);
    setUser(null);
    navigate('/', { replace: true });
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

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const toggleAdminProfileDropdown = () => {
    setShowAdminProfileDropdown(!showAdminProfileDropdown);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
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
                className={`nav-link ${activeSection === 'pending' ? 'active' : ''}`}
                onClick={() => setActiveSection('pending')}
              >
                <Clock size={18} />
                <span>Pending Approvals</span>
              </button>
            </div>
          </div>

          {/* Right side - Profile and Actions */}
          <div className="nav-right">
            {/* Admin Profile Section */}
            <div id="admin-profile-wrapper" className="student-profile-wrapper">
              <button 
                id="admin-profile-trigger-btn"
                className="student-profile-trigger-btn" 
                onClick={toggleAdminProfileDropdown}
              >
                <div id="admin-profile-avatar-mini" className="student-profile-avatar-mini">
                  <User size={18} />
                </div>
              </button>
              
              {showAdminProfileDropdown && (
                <div id="admin-profile-dropdown-menu" className="student-profile-dropdown-menu">
                  <div id="admin-profile-dropdown-actions" className="student-profile-dropdown-actions">
                    <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <p style={{ color: '#FFFFFF', margin: '0 0 0.5rem 0', fontWeight: '600' }}>{user?.firstName} {user?.lastName}</p>
                      <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '0', fontSize: '0.85rem' }}>Admin Account</p>
                    </div>
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
              className={`mobile-nav-link ${activeSection === 'pending' ? 'active' : ''}`}
              onClick={() => {
                setActiveSection('pending');
                setShowMobileMenu(false);
              }}
            >
              <Clock size={18} />
              <span>Pending Approvals</span>
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

          {/* Overview Section */}
          {activeSection === 'overview' && (
            <div className="overview-section">
              {/* Welcome Header */}
              <div className="welcome-header-with-stats">
                <div className="aurora-background">
                  <Aurora
                    colorStops={["#822130", "#2e144d", "#88202a"]}
                    blend={0.5}
                    amplitude={1.0}
                    speed={0.5}
                  />
                </div>
                <div className="welcome-content">
                  <h1 className="welcome-title">Welcome, Admin {user?.firstName}!</h1>
                  <p className="welcome-description">Manage pending registrations and course approvals.</p>
                </div>

                {/* Stats */}
                <div className="vertical-stats">
                  <div className="stat-tube">
                    <div className="stat-icon">
                      <Users size={20} />
                    </div>
                    <div className="stat-content">
                      <h3>{pendingStudents.length}</h3>
                      <p>Pending Students</p>
                    </div>
                  </div>
                  <div className="stat-tube">
                    <div className="stat-icon">
                      <User size={20} />
                    </div>
                    <div className="stat-content">
                      <h3>{pendingProfessors.length}</h3>
                      <p>Pending Professors</p>
                    </div>
                  </div>
                  <div className="stat-tube">
                    <div className="stat-icon">
                      <BookOpen size={20} />
                    </div>
                    <div className="stat-content">
                      <h3>{pendingCourses.length}</h3>
                      <p>Pending Courses</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats Cards */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-card-icon">
                    <UserCheck size={24} />
                  </div>
                  <div className="stat-card-content">
                    <h3>{pendingStudents.length + pendingProfessors.length}</h3>
                    <p>Total Pending Accounts</p>
                  </div>
                  {/* Crosshair Corners */}
                  <div className="crosshair-corner crosshair-top-left"></div>
                  <div className="crosshair-corner crosshair-top-right"></div>
                  <div className="crosshair-corner crosshair-bottom-left"></div>
                  <div className="crosshair-corner crosshair-bottom-right"></div>
                </div>

                <div className="stat-card">
                  <div className="stat-card-icon">
                    <BookOpen size={24} />
                  </div>
                  <div className="stat-card-content">
                    <h3>{pendingCourses.length}</h3>
                    <p>Pending Course Approvals</p>
                  </div>
                  {/* Crosshair Corners */}
                  <div className="crosshair-corner crosshair-top-left"></div>
                  <div className="crosshair-corner crosshair-top-right"></div>
                  <div className="crosshair-corner crosshair-bottom-left"></div>
                  <div className="crosshair-corner crosshair-bottom-right"></div>
                </div>
              </div>
            </div>
          )}

          {/* Pending Approvals Section */}
          {activeSection === 'pending' && (
            <div className="pending-section">
              <h2 style={{ 
                color: '#FFFFFF', 
                marginBottom: '2rem',
                fontFamily: 'Georgia, serif',
                fontSize: '2.5rem',
                fontWeight: '700',
                textAlign: 'center',
                letterSpacing: '1px'
              }}>Pending Approvals</h2>

              {/* Tabs */}
              <div className="tabs-container">
                <button 
                  className={`tab-button ${activeTab === 'students' ? 'active' : ''}`}
                  onClick={() => setActiveTab('students')}
                >
                  <Users size={18} />
                  <span>Students ({pendingStudents.length})</span>
                </button>
                <button 
                  className={`tab-button ${activeTab === 'professors' ? 'active' : ''}`}
                  onClick={() => setActiveTab('professors')}
                >
                  <User size={18} />
                  <span>Professors ({pendingProfessors.length})</span>
                </button>
                <button 
                  className={`tab-button ${activeTab === 'courses' ? 'active' : ''}`}
                  onClick={() => setActiveTab('courses')}
                >
                  <BookOpen size={18} />
                  <span>Courses ({pendingCourses.length})</span>
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content-area">
                {/* Students Tab */}
                {activeTab === 'students' && (
                  <div className="cards-grid">
                    {pendingStudents.length === 0 ? (
                      <div className="empty-state">
                        <CheckCircle2 size={64} style={{ color: '#E17564', marginBottom: '1rem' }} />
                        <h3 style={{ color: '#FFFFFF' }}>No pending students</h3>
                        <p style={{ color: '#E5E5CB' }}>All student registrations have been processed</p>
                      </div>
                    ) : (
                      pendingStudents.map(student => (
                        <div key={student.id} className="approval-card">
                          <div className="card-content">
                            <h3>{student.first_name} {student.last_name}</h3>
                            <p className="card-subtitle">{student.student_number}</p>
                            <p className="card-email">{student.email}</p>
                            <div className="card-meta">
                              <span className="badge-primary">{student.program}</span>
                              <span className="card-date">{formatDate(student.created_at)}</span>
                            </div>
                          </div>
                          <div className="card-actions">
                            <button 
                              className="action-btn view-btn"
                              onClick={() => handleViewDetails(student)}
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              className="action-btn approve-btn"
                              onClick={() => handleApprove(student.id, 'student')}
                              title="Approve"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button 
                              className="action-btn reject-btn"
                              onClick={() => handleReject(student.id, 'student')}
                              title="Reject"
                            >
                              <UserX size={16} />
                            </button>
                          </div>
                          {/* Crosshair Corners */}
                          <div className="crosshair-corner crosshair-top-left"></div>
                          <div className="crosshair-corner crosshair-top-right"></div>
                          <div className="crosshair-corner crosshair-bottom-left"></div>
                          <div className="crosshair-corner crosshair-bottom-right"></div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Professors Tab */}
                {activeTab === 'professors' && (
                  <div className="cards-grid">
                    {pendingProfessors.length === 0 ? (
                      <div className="empty-state">
                        <CheckCircle2 size={64} style={{ color: '#E17564', marginBottom: '1rem' }} />
                        <h3 style={{ color: '#FFFFFF' }}>No pending professors</h3>
                        <p style={{ color: '#E5E5CB' }}>All professor registrations have been processed</p>
                      </div>
                    ) : (
                      pendingProfessors.map(professor => (
                        <div key={professor.id} className="approval-card">
                          <div className="card-content">
                            <h3>{professor.first_name} {professor.last_name}</h3>
                            <p className="card-subtitle">{professor.employee_number}</p>
                            <p className="card-email">{professor.email}</p>
                            <div className="card-meta">
                              <span className="badge-primary">{professor.college}</span>
                              <span className="card-date">{formatDate(professor.created_at)}</span>
                            </div>
                          </div>
                          <div className="card-actions">
                            <button 
                              className="action-btn view-btn"
                              onClick={() => handleViewDetails(professor)}
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              className="action-btn approve-btn"
                              onClick={() => handleApprove(professor.id, 'professor')}
                              title="Approve"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button 
                              className="action-btn reject-btn"
                              onClick={() => handleReject(professor.id, 'professor')}
                              title="Reject"
                            >
                              <UserX size={16} />
                            </button>
                          </div>
                          {/* Crosshair Corners */}
                          <div className="crosshair-corner crosshair-top-left"></div>
                          <div className="crosshair-corner crosshair-top-right"></div>
                          <div className="crosshair-corner crosshair-bottom-left"></div>
                          <div className="crosshair-corner crosshair-bottom-right"></div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Courses Tab */}
                {activeTab === 'courses' && (
                  <div className="cards-grid">
                    {pendingCourses.length === 0 ? (
                      <div className="empty-state">
                        <CheckCircle2 size={64} style={{ color: '#E17564', marginBottom: '1rem' }} />
                        <h3 style={{ color: '#FFFFFF' }}>No pending courses</h3>
                        <p style={{ color: '#E5E5CB' }}>All course requests have been processed</p>
                      </div>
                    ) : (
                      pendingCourses.map(course => (
                        <div key={course.id} className="approval-card course-approval-card">
                          <div className="card-content">
                            <h3>{course.course_name}</h3>
                            <p className="card-subtitle">{course.course_code} • Section {course.section}</p>
                            <p className="card-email">{course.professor_name}</p>
                            <div className="card-meta">
                              <span className="badge-success">{course.program}</span>
                              <span className="card-date">{formatDate(course.created_at)}</span>
                            </div>
                          </div>
                          <div className="card-actions">
                            <button 
                              className="action-btn view-btn"
                              onClick={() => handleViewCourseDetails(course)}
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              className="action-btn approve-btn"
                              onClick={() => handleApprove(course.id, 'course')}
                              title="Approve"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button 
                              className="action-btn reject-btn"
                              onClick={() => handleReject(course.id, 'course')}
                              title="Reject"
                            >
                              <UserX size={16} />
                            </button>
                          </div>
                          {/* Crosshair Corners */}
                          <div className="crosshair-corner crosshair-top-left"></div>
                          <div className="crosshair-corner crosshair-top-right"></div>
                          <div className="crosshair-corner crosshair-bottom-left"></div>
                          <div className="crosshair-corner crosshair-bottom-right"></div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Account Details Modal */}
      {showModal && selectedAccount && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Account Details</h2>
              <button 
                className="close-btn"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-row">
                  <span className="detail-label">Full Name:</span>
                  <span className="detail-value">{selectedAccount.first_name} {selectedAccount.middle_name} {selectedAccount.last_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedAccount.email}</span>
                </div>
                {selectedAccount.student_number && (
                  <>
                    <div className="detail-row">
                      <span className="detail-label">Student Number:</span>
                      <span className="detail-value">{selectedAccount.student_number}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Program:</span>
                      <span className="detail-value">{selectedAccount.program}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Year Level:</span>
                      <span className="detail-value">{selectedAccount.year_level}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Class Status:</span>
                      <span className="detail-value">{selectedAccount.class_status}</span>
                    </div>
                  </>
                )}
                {selectedAccount.employee_number && (
                  <div className="detail-row">
                    <span className="detail-label">Employee Number:</span>
                    <span className="detail-value">{selectedAccount.employee_number}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">College:</span>
                  <span className="detail-value">{selectedAccount.college}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Application Date:</span>
                  <span className="detail-value">{formatDate(selectedAccount.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                type="button"
                className="btn btn-outline"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
              <button 
                className="btn btn-success"
                onClick={() => {
                  handleApprove(selectedAccount.id, selectedAccount.student_number ? 'student' : 'professor');
                  setShowModal(false);
                }}
              >
                <UserCheck size={16} />
                Approve
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => {
                  handleReject(selectedAccount.id, selectedAccount.student_number ? 'student' : 'professor');
                  setShowModal(false);
                }}
              >
                <UserX size={16} />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Details Modal */}
      {showCourseModal && selectedCourse && (
        <div className="modal-overlay" onClick={() => setShowCourseModal(false)}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Course Details</h2>
              <button 
                className="close-btn"
                onClick={() => setShowCourseModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="details-grid">
                <div className="detail-row">
                  <span className="detail-label">Course Name:</span>
                  <span className="detail-value">{selectedCourse.course_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Course Code:</span>
                  <span className="detail-value">{selectedCourse.course_code}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Program:</span>
                  <span className="detail-value">{selectedCourse.program}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Section:</span>
                  <span className="detail-value">{selectedCourse.section}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Semester:</span>
                  <span className="detail-value">{selectedCourse.semester}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">School Year:</span>
                  <span className="detail-value">{selectedCourse.school_year}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Max Students:</span>
                  <span className="detail-value">{selectedCourse.max_students}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Professor:</span>
                  <span className="detail-value">{selectedCourse.professor_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Professor Email:</span>
                  <span className="detail-value">{selectedCourse.professor_email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Request Date:</span>
                  <span className="detail-value">{formatDate(selectedCourse.created_at)}</span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                type="button"
                className="btn btn-outline"
                onClick={() => setShowCourseModal(false)}
              >
                Close
              </button>
              <button 
                className="btn btn-success"
                onClick={() => {
                  handleApprove(selectedCourse.id, 'course');
                  setShowCourseModal(false);
                }}
              >
                <UserCheck size={16} />
                Approve Course
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => {
                  handleReject(selectedCourse.id, 'course');
                  setShowCourseModal(false);
                }}
              >
                <UserX size={16} />
                Reject Course
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .admin-dashboard {
          min-height: 100vh;
          background: #09122C;
          color: #FFFFFF;
          position: relative;
          overflow-x: hidden;
        }

        .squares-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }

        .loading-screen {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #09122C;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid rgba(225, 117, 100, 0.3);
          border-top: 3px solid #E17564;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* Navigation */
        .top-nav {
          position: relative;
          z-index: 100;
          background: #09122C;
          border-bottom: 1px solid rgba(225, 117, 100, 0.2);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        .nav-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 0 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 70px;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 3rem;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: #FFFFFF;
        }

        .logo-image {
          height: 40px;
          width: auto;
        }

        .nav-links {
          display: flex;
          gap: 0;
          align-items: center;
        }

        .nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          font-weight: 600;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          border-bottom: 2px solid transparent;
        }

        .nav-link:hover {
          color: #FFFFFF;
          background: rgba(225, 117, 100, 0.1);
        }

        .nav-link.active {
          color: #E17564;
          border-bottom-color: #E17564;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .student-profile-wrapper {
          position: relative;
        }

        .student-profile-trigger-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(225, 117, 100, 0.2);
          border: 2px solid rgba(225, 117, 100, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          transition: all 0.3s ease;
        }

        .student-profile-trigger-btn:hover {
          background: rgba(225, 117, 100, 0.3);
          border-color: rgba(225, 117, 100, 0.6);
        }

        .student-profile-avatar-mini {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .student-profile-dropdown-menu {
          position: absolute;
          top: calc(100% + 0.75rem);
          right: 0;
          background: rgba(9, 18, 44, 0.95) !important;
          border-radius: 16px !important;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5) !important;
          backdrop-filter: blur(10px) !important;
          border: 1px solid rgba(135, 35, 65, 0.4) !important;
          width: 220px;
          z-index: 9998;
          overflow: hidden;
        }

        .student-profile-dropdown-actions {
          padding: 0.75rem 0.5rem;
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
          transition: all 0.3s ease;
          color: #FFFFFF !important;
          text-align: left;
          font-size: 0.9rem;
          font-weight: 600;
        }

        .student-profile-action-item:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          transform: translateX(5px);
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
        }

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
          border-top: 1px solid rgba(225, 117, 100, 0.2);
          padding: 1rem;
        }

        .mobile-nav-link {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(225, 117, 100, 0.1);
          border: none;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          border-radius: 8px;
          font-weight: 600;
          margin-bottom: 0.5rem;
          transition: all 0.3s ease;
        }

        .mobile-nav-link:hover,
        .mobile-nav-link.active {
          background: rgba(225, 117, 100, 0.3);
          color: #E17564;
        }

        /* Main Content */
        .main-content {
          position: relative;
          z-index: 10;
          min-height: calc(100vh - 70px);
        }

        .content-area {
          max-width: 1400px;
          margin: 0 auto;
          padding: 2rem;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(225, 117, 100, 0.2);
          border: 1px solid rgba(225, 117, 100, 0.5);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 2rem;
          color: #E17564;
        }

        /* Overview Section */
        .overview-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .welcome-header-with-stats {
          position: relative;
          display: flex;
          align-items: flex-end;
          gap: 2rem;
          padding: 3rem;
          border-radius: 20px;
          background: rgba(9, 18, 44, 0.5);
          border: 1px solid rgba(225, 117, 100, 0.2);
          backdrop-filter: blur(10px);
          overflow: hidden;
          min-height: 200px;
        }

        .aurora-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 0;
        }

        .welcome-content {
          flex: 1;
          position: relative;
          z-index: 1;
        }

        .welcome-title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #FFFFFF;
        }

        .welcome-description {
          font-size: 1rem;
          color: #E5E5CB;
        }

        .vertical-stats {
          display: flex;
          gap: 1.5rem;
          position: relative;
          z-index: 1;
        }

        .stat-tube {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1.5rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(225, 117, 100, 0.3);
          border-radius: 12px;
          backdrop-filter: blur(10px);
          min-width: 120px;
          transition: all 0.3s ease;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .stat-icon {
          color: #E17564;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-content h3 {
          font-size: 1.5rem;
          font-weight: 700;
          margin: 0;
          color: #FFFFFF;
        }

        .stat-content p {
          font-size: 0.75rem;
          color: #E5E5CB;
          margin: 0;
          text-align: center;
        }

        /* Stats Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
        }

        .stat-card {
          position: relative;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          padding: 2rem;
          background: rgba(9, 18, 44, 0.7);
          border: 2px solid rgba(225, 117, 100, 0.3);
          border-radius: 12px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: all 0.3s ease;
        }

        .stat-card:hover {
          border-color: rgba(225, 117, 100, 0.6);
          background: rgba(9, 18, 44, 0.8);
          transform: translateY(-2px);
        }

        .stat-card-icon {
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(225, 117, 100, 0.2);
          border-radius: 10px;
          color: #E17564;
          flex-shrink: 0;
        }

        .stat-card-content h3 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0 0 0.25rem 0;
          color: #FFFFFF;
        }

        .stat-card-content p {
          font-size: 0.85rem;
          color: #E5E5CB;
          margin: 0;
        }

        /* Crosshairs */
        .crosshair-corner {
          position: absolute;
          width: 20px;
          height: 20px;
        }

        .crosshair-corner::before,
        .crosshair-corner::after {
          content: '';
          position: absolute;
          background: rgba(225, 117, 100, 0.6);
        }

        .crosshair-corner::before {
          width: 100%;
          height: 2px;
          top: 50%;
          left: 0;
          transform: translateY(-50%);
        }

        .crosshair-corner::after {
          width: 2px;
          height: 100%;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
        }

        .crosshair-top-left {
          top: 0;
          left: 0;
        }

        .crosshair-top-right {
          top: 0;
          right: 0;
          transform: scaleX(-1);
        }

        .crosshair-bottom-left {
          bottom: 0;
          left: 0;
          transform: scaleY(-1);
        }

        .crosshair-bottom-right {
          bottom: 0;
          right: 0;
          transform: scale(-1);
        }

        /* Pending Section */
        .pending-section {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        /* Tabs */
        .tabs-container {
          display: flex;
          gap: 1rem;
          border-bottom: 1px solid rgba(225, 117, 100, 0.2);
          overflow-x: auto;
        }

        .tab-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          cursor: pointer;
          font-weight: 600;
          font-size: 0.95rem;
          border-bottom: 2px solid transparent;
          transition: all 0.3s ease;
          white-space: nowrap;
        }

        .tab-button:hover {
          color: #FFFFFF;
          border-bottom-color: rgba(225, 117, 100, 0.5);
        }

        .tab-button.active {
          color: #E17564;
          border-bottom-color: #E17564;
        }

        /* Cards Grid */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .approval-card {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 1.5rem;
          background: rgba(9, 18, 44, 0.6);
          border: 2px solid rgba(225, 117, 100, 0.3);
          border-radius: 12px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: all 0.3s ease;
          min-height: 250px;
        }

        .approval-card:hover {
          border-color: rgba(225, 117, 100, 0.6);
          background: rgba(9, 18, 44, 0.8);
          transform: translateY(-4px);
        }

        .course-approval-card {
          border-left: 4px solid #28a745;
        }

        .request-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(225, 117, 100, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1rem;
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

        @media (max-width: 1024px) {
          .requests-two-column-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }
        }

        .card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .card-content h3 {
          font-size: 1.1rem;
          font-weight: 700;
          margin: 0;
          color: #FFFFFF;
        }

        .card-subtitle {
          font-size: 0.85rem;
          color: #E5E5CB;
          margin: 0;
        }

        .card-email {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
        }

        .card-meta {
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-top: 0.5rem;
        }

        .badge-primary {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: rgba(225, 117, 100, 0.2);
          color: #E17564;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .badge-success {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: rgba(40, 167, 69, 0.2);
          color: #28a745;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .card-date {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .card-actions {
          display: flex;
          gap: 0.5rem;
          justify-content: flex-end;
        }

        .action-btn {
          width: 36px;
          height: 36px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        }

        .view-btn {
          background: rgba(225, 117, 100, 0.2);
          color: #E17564;
          border: 1px solid rgba(225, 117, 100, 0.4);
        }

        .view-btn:hover {
          background: rgba(225, 117, 100, 0.4);
          border-color: rgba(225, 117, 100, 0.6);
        }

        .approve-btn {
          background: rgba(40, 167, 69, 0.2);
          color: #28a745;
          border: 1px solid rgba(40, 167, 69, 0.4);
        }

        .approve-btn:hover {
          background: rgba(40, 167, 69, 0.4);
          border-color: rgba(40, 167, 69, 0.6);
        }

        .reject-btn {
          background: rgba(220, 53, 69, 0.2);
          color: #dc3545;
          border: 1px solid rgba(220, 53, 69, 0.4);
        }

        .reject-btn:hover {
          background: rgba(220, 53, 69, 0.4);
          border-color: rgba(220, 53, 69, 0.6);
        }

        .empty-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
          background: rgba(225, 117, 100, 0.08);
          border: 2px dashed rgba(225, 117, 100, 0.4);
          border-radius: 12px;
          margin: 2rem 0;
        }

        .empty-state h3 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #FFFFFF !important;
        }

        .empty-state p {
          color: #E5E5CB !important;
        }

        /* Modals */
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

        .details-grid {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .detail-row {
          display: grid;
          grid-template-columns: 150px 1fr;
          gap: 1rem;
          align-items: center;
        }

        .detail-label {
          font-weight: 600;
          color: #E5E5CB;
          font-size: 0.9rem;
        }

        .detail-value {
          color: #FFFFFF;
          font-size: 0.95rem;
        }

        .modal-actions {
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
          padding: 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          transition: all 0.3s ease;
          text-decoration: none;
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

        .btn-success {
          background: #28a745 !important;
          color: #FFFFFF !important;
        }

        .btn-success:hover {
          background: #218838 !important;
          transform: translateY(-2px);
        }

        .btn-danger {
          background: #dc3545 !important;
          color: #FFFFFF !important;
        }

        .btn-danger:hover {
          background: #c82333 !important;
          transform: translateY(-2px);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .nav-container {
            padding: 0 1rem;
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
            align-items: flex-start;
          }

          .vertical-stats {
            width: 100%;
            flex-wrap: wrap;
          }

          .stat-tube {
            flex: 1;
            min-width: 100px;
          }

          .cards-grid {
            grid-template-columns: 1fr;
          }

          .detail-row {
            grid-template-columns: 1fr;
            gap: 0.25rem;
          }

          .modal-actions {
            flex-direction: column;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }

          .tabs-container {
            flex-direction: column;
          }

          .tab-button {
            padding: 0.75rem 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;
