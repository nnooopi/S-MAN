import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Signin from './components/Signin';
import Signup from './components/Signup';
import StudentDashboard from './components/StudentDashboard';
import ProfessorDashboard from './components/ProfessorDashboard';
import AdminDashboard from './components/AdminDashboard';
import CourseStudentDashboard from './components/CourseStudentDashboard';
import CourseProfessorDashboard from './components/CourseProfessorDashboard';

// Protected Route Component
const ProtectedRoute = ({ children, requiredUserType = null }) => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  if (!token || !userData) {
    return <Navigate to="/signin" replace />;
  }

  if (requiredUserType) {
    const user = JSON.parse(userData);
    if (user.userType !== requiredUserType) {
      // Redirect to appropriate dashboard based on user type
      if (user.userType === 'admin') {
        return <Navigate to="/admin" replace />;
      } else if (user.userType === 'student') {
        return <Navigate to="/student" replace />;
      } else if (user.userType === 'professor') {
        return <Navigate to="/professor" replace />;
      }
    }
  }

  return children;
};

// Dashboard Router Component - routes to correct dashboard based on user type
const DashboardRouter = () => {
  const token = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  if (!token || !userData) {
    return <Navigate to="/signin" replace />;
  }

  const user = JSON.parse(userData);

  switch (user.userType) {
    case 'admin':
      return <Navigate to="/admin" replace />;
    case 'student':
      return <Navigate to="/student-dashboard" replace />; // Updated
    case 'professor':
      return <Navigate to="/professor-dashboard" replace />; // Updated
    default:
      return <Navigate to="/signin" replace />;
  }
};

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Generic Dashboard Route - redirects to appropriate dashboard */}
          <Route path="/dashboard" element={<DashboardRouter />} />
          
          {/* Specific Dashboard Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requiredUserType="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          // Change the route paths to be consistent
<Route 
  path="/student-dashboard" 
  element={
    <ProtectedRoute requiredUserType="student">
      <StudentDashboard />
    </ProtectedRoute>
  } 
/>
<Route 
  path="/professor-dashboard" 
  element={
    <ProtectedRoute requiredUserType="professor">
      <ProfessorDashboard />
    </ProtectedRoute>
  } 
/>
          
          {/* ✅ NEW: Course Dashboard Routes */}
          <Route 
            path="/course/student/:courseId" 
            element={
              <ProtectedRoute requiredUserType="student">
                <CourseStudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/course/professor/:courseId" 
            element={
              <ProtectedRoute requiredUserType="professor">
                <CourseProfessorDashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;