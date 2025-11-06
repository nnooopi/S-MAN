import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, User, Mail, Lock, Upload, FileText, Camera } from 'lucide-react';
import VerificationModal from './VerificationModal';
import FaultyTerminal from './FaultyTerminal';

const Signup = () => {
  const [userType, setUserType] = useState('student');
  
  // Memoize the terminal component to prevent re-renders when form state changes
  const terminalComponent = useMemo(() => (
    <FaultyTerminal
      scale={2}
      gridMul={[2, 1]}
      digitSize={1.9}
      timeScale={0.5}
      pause={false}
      scanlineIntensity={0.5}
      glitchAmount={1}
      flickerAmount={1}
      noiseAmp={0.8}
      chromaticAberration={0}
      dither={0}
      curvature={0.21}
      tint="#872341"
      backgroundColor="#09122C"
      mouseReact={true}
      mouseStrength={0.5}
      pageLoadAnimation={false}
      brightness={0.8}
    />
  ), []);
  
  const [formData, setFormData] = useState({
    // Common fields
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    college: 'College of Computer Studies',
    
    // Student specific
    studentNumber: '',
    program: '',
    classStatus: '',
    yearLevel: '',
    
    // Professor specific
    employeeNumber: ''
  });
  const [files, setFiles] = useState({
    profileImage: null,
    registrationCard: null
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationId, setVerificationId] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleFileChange = (e, fileType) => {
    const file = e.target.files[0];
    if (file) {
      setFiles({
        ...files,
        [fileType]: file
      });
    }
  };

  const validateForm = () => {
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (userType === 'student') {
      if (!formData.email.endsWith('@student.fatima.edu.ph')) {
        setError('Student email must end with @student.fatima.edu.ph');
        return false;
      }
      if (!['BSIT', 'BSEMC', 'BSCS'].includes(formData.program)) {
        setError('Please select a valid program');
        return false;
      }
      if (!['regular', 'irregular'].includes(formData.classStatus)) {
        setError('Please select class status');
        return false;
      }
      const year = parseInt(formData.yearLevel);
      if (year < 1 || year > 4) {
        setError('Year level must be between 1 and 4');
        return false;
      }
    } else {
      if (!formData.email.endsWith('@fatima.edu.ph') && !formData.email.endsWith('@gmail.com')) {
        setError('Professor email must end with @fatima.edu.ph or @gmail.com (for testing)');
        return false;
      }
    }

    if (!files.profileImage) {
      setError('Profile image is required');
      return false;
    }

    if (!files.registrationCard) {
      setError('Registration card is required');
      return false;
    }

    if (files.registrationCard && files.registrationCard.type !== 'application/pdf') {
      setError('Registration card must be a PDF file');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const submitData = new FormData();
      
      // Add form data
      Object.keys(formData).forEach(key => {
        if (formData[key] && key !== 'confirmPassword') {
          submitData.append(key, formData[key]);
        }
      });

      // Add files
      if (files.profileImage) {
        submitData.append('profileImage', files.profileImage);
      }
      if (files.registrationCard) {
        submitData.append('registrationCard', files.registrationCard);
      }

      const endpoint = userType === 'student' ? '/api/signup/student' : '/api/signup/professor';
      const response = await axios.post(endpoint, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setVerificationId(response.data.verificationId);
      setShowVerification(true);
    } catch (error) {
      setError(error.response?.data?.error || 'An error occurred during signup');
    } finally {
      setLoading(false);
    }
  };

  const FileUploadArea = ({ fileType, accept, icon: Icon, label, description }) => (
    <div className="form-group">
      <label className="form-label">
        <Icon size={20} />
        {label}
      </label>
      <div 
        className={`file-upload-area ${files[fileType] ? 'has-file' : ''}`}
        onClick={() => document.getElementById(fileType).click()}
      >
        <Icon size={48} />
        <p><strong>Click to upload</strong> or drag and drop</p>
        <p className="file-description">{description}</p>
        {files[fileType] && (
          <div className="file-info">
            <strong>Selected:</strong> {files[fileType].name}
          </div>
        )}
      </div>
      <input
        type="file"
        id={fileType}
        name={fileType}
        accept={accept}
        onChange={(e) => handleFileChange(e, fileType)}
        style={{ display: 'none' }}
      />
    </div>
  );

  return (
    <div className="signup-page">
      {/* FaultyTerminal Background */}
      <div className="terminal-background">
        {terminalComponent}
      </div>
      
      <div className="signup-container">
        <div className="signup-header">
          <div className="logo">
            <img src="/S-MAN-LOGO-WHITE.png" alt="S-MAN Logo" className="logo-image" />
            
            <span></span>
          </div>
          <hr className="logo-divider" />
          <br></br>
          <h1>Create Your Account</h1>
          <p>Join the S-MAN community and start managing your academic projects</p>
        </div>

        <div className="user-type-selector">
          <button
            type="button"
            className={`user-type-btn ${userType === 'student' ? 'active' : ''}`}
            onClick={() => setUserType('student')}
          >
            Student
          </button>
          <button
            type="button"
            className={`user-type-btn ${userType === 'professor' ? 'active' : ''}`}
            onClick={() => setUserType('professor')}
          >
            Professor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {/* Personal Information */}
          <div className="form-section">
            <h3>Personal Information</h3>
            
            <div className="personal-info-grid">
              {/* Left: Profile Image */}
              <div className="profile-upload-section">
                <FileUploadArea
                  fileType="profileImage"
                  accept="image/*"
                  icon={Camera}
                  label="Profile Image"
                  description="Upload a clear photo of yourself (JPG, PNG, GIF)"
                />
              </div>
              
              {/* Right: Name Fields */}
              <div className="name-fields-section">
              <div className="form-group">
                <label className="form-label">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your first name"
                  required
                  style={{ 
                    background: '#FFFFFF !important', 
                    color: '#09122C !important',
                    border: '2px solid #872341 !important'
                  }}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your middle name"
                  required
                  style={{ 
                    background: '#FFFFFF !important', 
                    color: '#09122C !important',
                    border: '2px solid #872341 !important'
                  }}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your last name"
                  required
                  style={{ 
                    background: '#FFFFFF !important', 
                    color: '#09122C !important',
                    border: '2px solid #872341 !important'
                  }}
                />
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="form-section">
            <h3>Account Information</h3>
            
            {/* Top Section: 2 Columns */}
            <div className="account-info-grid">
              {/* Left: First 3 Fields */}
              <div className="account-top-fields">
            {userType === 'student' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Student Number</label>
                  <input
                    type="text"
                    name="studentNumber"
                    value={formData.studentNumber}
                    onChange={handleChange}
                    className="form-input"
                    placeholder="Enter your student number"
                    required
                    style={{ 
                      background: '#FFFFFF !important', 
                      color: '#09122C !important',
                      border: '2px solid #872341 !important'
                    }}
                  />
                </div>
                
                  <div className="form-group">
                    <label className="form-label">Program</label>
                    <select
                      name="program"
                      value={formData.program}
                      onChange={handleChange}
                      className="form-select"
                      required
                      style={{ 
                        background: '#FFFFFF !important', 
                        color: '#09122C !important',
                        border: '2px solid #872341 !important'
                      }}
                    >
                      <option value="">Select Program</option>
                      <option value="BSIT">BSIT</option>
                      <option value="BSEMC">BSEMC</option>
                      <option value="BSCS">BSCS</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Class Status</label>
                    <select
                      name="classStatus"
                      value={formData.classStatus}
                      onChange={handleChange}
                      className="form-select"
                      required
                      style={{ 
                        background: '#FFFFFF !important', 
                        color: '#09122C !important',
                        border: '2px solid #872341 !important'
                      }}
                    >
                      <option value="">Select Status</option>
                      <option value="regular">Regular</option>
                      <option value="irregular">Irregular</option>
                    </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label className="form-label">Employee Number</label>
                      <input
                        type="text"
                        name="employeeNumber"
                        value={formData.employeeNumber}
                        onChange={handleChange}
                        className="form-input"
                        placeholder="Enter your employee number"
                        required
                        style={{ 
                          background: '#FFFFFF !important', 
                          color: '#09122C !important',
                          border: '2px solid #872341 !important'
                        }}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label className="form-label">College</label>
                      <input
                        type="text"
                        name="college"
                        value={formData.college}
                        className="form-input"
                        disabled
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.1) !important', 
                          color: 'rgba(255, 255, 255, 0.5) !important',
                          border: '2px solid rgba(255, 255, 255, 0.2) !important'
                        }}
                      />
                    </div>
                  </>
                )}
                  </div>
                  
              {/* Right: Registration Card Upload */}
              <div className="registration-upload-section">
                <FileUploadArea
                  fileType="registrationCard"
                  accept=".pdf"
                  icon={FileText}
                  label="Registration Card"
                  description="Upload your registration card (PDF only)"
                />
              </div>
            </div>
            
            {/* Bottom Section: Full Width Fields */}
            <div className="account-bottom-fields">
              {userType === 'student' && (
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Year Level</label>
                    <select
                      name="yearLevel"
                      value={formData.yearLevel}
                      onChange={handleChange}
                      className="form-select"
                      required
                      style={{ 
                        background: '#FFFFFF !important', 
                        color: '#09122C !important',
                        border: '2px solid #872341 !important'
                      }}
                    >
                      <option value="">Select Year</option>
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">College</label>
                    <input
                      type="text"
                      name="college"
                      value={formData.college}
                      className="form-input"
                      disabled
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.1) !important', 
                        color: 'rgba(255, 255, 255, 0.5) !important',
                        border: '2px solid rgba(255, 255, 255, 0.2) !important'
                      }}
                    />
                  </div>
                </div>
              )}
            
            <div className="form-group">
              <label className="form-label">
                <Mail size={20} />
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder={userType === 'student' 
                  ? 'your.email@student.fatima.edu.ph' 
                  : 'your.email@fatima.edu.ph'
                }
                required
                style={{ 
                  background: '#FFFFFF !important', 
                  color: '#09122C !important',
                  border: '2px solid #872341 !important'
                }}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <Lock size={20} />
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your password"
                  required
                  style={{ 
                    background: '#FFFFFF !important', 
                    color: '#09122C !important',
                    border: '2px solid #872341 !important'
                  }}
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">
                  <Lock size={20} />
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Confirm your password"
                  required
                  style={{ 
                    background: '#FFFFFF !important', 
                    color: '#09122C !important',
                    border: '2px solid #872341 !important'
                  }}
                />
              </div>
            </div>
          </div>
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? (
              <div className="loading">
                <div className="spinner"></div>
              </div>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="signup-footer">
          <p>
            Already have an account?{' '}
            <Link to="/signin" className="link">
              Sign in here
            </Link>
          </p>
          <Link to="/" className="link">
            Back to Home
          </Link>
        </div>
      </div>

      {showVerification && (
        <VerificationModal
          verificationId={verificationId}
          email={formData.email}
          onClose={() => setShowVerification(false)}
        />
      )}

      <style>{`
        /* CRITICAL: Override all conflicting input styles with maximum specificity */
        .signup-page .signup-container .signup-form .form-group input[type="text"],
        .signup-page .signup-container .signup-form .form-group input[type="email"],
        .signup-page .signup-container .signup-form .form-group input[type="password"],
        .signup-page .signup-container .signup-form .form-group select,
        .signup-page .signup-container .signup-form .account-top-fields input,
        .signup-page .signup-container .signup-form .account-top-fields select,
        .signup-page .signup-container .signup-form .name-fields-section input,
        .signup-page .signup-container .signup-form .account-bottom-fields input,
        .signup-page .signup-container .signup-form .account-bottom-fields select,
        .signup-form input.form-input,
        .signup-form select.form-select,
        input.form-input,
        select.form-select {
          background: #FFFFFF !important;
          background-color: #FFFFFF !important;
          color: #09122C !important;
          border: 2px solid #872341 !important;
          padding: 1rem 1.1rem !important;
          border-radius: 0px !important;
          font-size: 1rem !important;
          box-sizing: border-box !important;
          min-height: 45px !important;
        }

        .signup-page .signup-container .signup-form .form-group input[type="text"]:disabled,
        .signup-page .signup-container .signup-form .form-group input:disabled,
        .signup-form input.form-input:disabled {
          background: rgba(255, 255, 255, 0.1) !important;
          background-color: rgba(255, 255, 255, 0.1) !important;
          color: rgba(255, 255, 255, 0.5) !important;
          border: 2px solid rgba(255, 255, 255, 0.2) !important;
        }

        .signup-page .signup-container .signup-form .form-group input::placeholder,
        .signup-form input.form-input::placeholder {
          color: rgba(9, 18, 44, 0.6) !important;
          opacity: 1 !important;
        }

        .signup-page .signup-container .signup-form .form-group select option,
        .signup-form select.form-select option {
          background: #FFFFFF !important;
          background-color: #FFFFFF !important;
          color: #09122C !important;
        }
      
        .signup-page {
          min-height: 100vh;
          background: #09122C;
          padding: 40px 20px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          overflow-y: auto;
        }
        
        .logo-divider {
          border-top: 2px dashed rgba(255, 255, 255, 0.3);
          margin: 0 auto;
          width: 300px;
        }

        .terminal-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1;
          pointer-events: auto;
          overflow: hidden;
        }

        .signup-container {
          background: #09122C;
          border-radius: 0px;
          padding: 40px;
          max-width: 900px;
          width: 90%;
          margin: 0 auto;
          border: 2px solid #872341;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 2;
        }

        .signup-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .logo {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          color: #FFFFFF;
          text-decoration: none;
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 20px;
          font-family: 'Georgia', serif;
        }

        .logo-image {
          height: 40px;
          width: auto;
          object-fit: contain;
        }

        .signup-header h1 {
          font-size: 2.25rem;
          color: #FFFFFF !important;
          margin-bottom: 0.5rem;
          font-weight: 700;
          font-family: 'Georgia', serif;
        }

        .signup-header p {
          color: #FFFFFF !important;
          margin-bottom: 0;
          font-weight: 500;
          opacity: 0.9;
        }

        .user-type-selector {
          display: flex;
          margin-bottom: 30px;
          border-radius: 0px;
          overflow: hidden;
          border: 2px solid #872341;
          background: transparent;
        }

        .user-type-btn {
          flex: 1;
          padding: 1rem;
          border: none;
          background: transparent;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          color: #FFFFFF;
        }

        .user-type-btn.active {
          background: #872341;
          color: white;
        }

        .user-type-btn:hover:not(.active) {
          background: rgba(135, 35, 65, 0.2);
          color: #E17564;
        }

        .signup-form {
          margin-bottom: 30px;
        }

        .signup-form * {
          color: inherit;
        }

        .signup-form label,
        .signup-form h3,
        .signup-form .form-label {
          color: #FFFFFF !important;
        }

        .form-section {
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid rgba(255, 255, 255, 0.1);
        }

        .form-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        .form-section h3 {
          color: #FFFFFF !important;
          font-size: 1.5rem;
          font-weight: 700;
          font-family: 'Georgia', serif;
        }

        .personal-info-grid {
          display: grid;
          grid-template-columns: 1.25fr 2fr;
          gap: 27px;
          align-items: stretch;
        }

        .profile-upload-section {
          display: flex;
          flex-direction: column;
          height: 75%;
        }
        
        .profile-upload-section .file-upload-area {
          flex: 1;
          min-height: 100%;
          height: 80%;
          display: flex;
        }

        .name-fields-section {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .account-info-grid {
          display: grid;
          grid-template-columns: 2fr 1.5fr;
          gap: 27px;
          align-items: stretch;
        }

        .registration-upload-section {
          display: flex;
          flex-direction: column;
           height: 75%;
        
        }
        
        .registration-upload-section .file-upload-area {
          margin-top: 0;
          flex: 1;
          min-height: 113%;
          height: 100%;
          display: flex;
        }

        .account-top-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        
        .account-top-fields .form-group:last-child {
          margin-bottom: 45px;
        }

        .account-bottom-fields {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100% !important;
          max-width: 100% !important;
        }

        .form-row {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 16px;
          width: 100% !important;
          max-width: 100% !important;
        }

        .form-group {
          display: flex !important;
          flex-direction: column !important;
          gap: 0.5rem;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          flex: 1 1 0 !important;
        }

        .form-label {
          display: flex !important;
          align-items: center !important;
          gap: 0.5rem !important;
          font-weight: 600;
          font-size: 0.95rem;
          color: #FFFFFF !important;
          flex-direction: row !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        
        .form-label svg {
          flex-shrink: 0;
          display: inline-block !important;
        }
        
        .form-group .form-label {
          display: flex !important;
          flex-direction: row !important;
          align-items: center !important;
        }

        .form-input, .form-select {
          /* These are now overridden by more specific selectors above */
          width: 100% !important;
          max-width: 100% !important;
          padding: 1rem 1.1rem;
          border: 2px solid #872341;
          border-radius: 0px;
          font-size: 1rem;
          transition: all 0.3s ease;
          box-sizing: border-box !important;
          min-height: 45px;
          flex: 1 1 auto !important;
        }

        .form-input::placeholder {
          opacity: 1;
        }

        .form-select {
          appearance: none;
        }

        .form-input:focus, .form-select:focus {
          outline: none;
          border-color: #E17564 !important;
        }

        .form-input:disabled {
          cursor: not-allowed !important;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          border: 2px solid #872341;
          border-radius: 0px;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.3s ease;
          cursor: pointer;
          font-size: 0.95rem;
        }

        .btn-primary {
          background: #BE3144 !important;
          color: #FFFFFF !important;
          border: none !important;
          border-radius: 16px !important;
          padding: 1.25rem 2.5rem !important;
          font-size: 1.1rem !important;
          font-weight: 600 !important;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06) !important;
        }

        .btn-primary:hover {
          background: #872341 !important;
          transform: translateY(-3px) !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
        }
        
        .btn-primary:active {
          transform: translateY(-1px) !important;
        }

        .btn-primary:disabled {
          background: #872341 !important;
          opacity: 0.7 !important;
          transform: none !important;
          cursor: not-allowed !important;
        }

        .btn-full {
          width: 100%;
        }

        .loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .signup-footer {
          text-align: center;
        }

        .signup-footer p {
          margin-bottom: 10px;
          color: #FFFFFF;
          font-weight: 500;
        }

        .link {
          color: #BE3144;
          text-decoration: none;
          font-weight: 600;
          transition: all 0.2s ease;
        }

        .link:hover {
          color: #E17564;
          text-decoration: underline;
        }

        .file-upload-area {
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.6) !important;
          position: relative;
          border: 2px dashed #872341;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.05);
          margin-top: 10px;
          padding: 15px;
        }
        
        .profile-upload-section .file-upload-area {
          margin-top: 0;
          min-height: 113%;
        }

        .file-upload-area p {
          color: rgba(255, 255, 255, 0.8) !important;
          margin: 5px 0;
          text-align: center;
        }

        .file-upload-area:hover {
          border-color: #BE3144;
          background-color: rgba(255, 255, 255, 0.1);
          color: #FFFFFF !important;
        }

        .file-upload-area:hover p {
          color: #FFFFFF !important;
        }

        .file-upload-area.has-file {
          border-color: #BE3144;
          background-color: rgba(255, 255, 255, 0.1);
          color: #FFFFFF !important;
        }

        .file-upload-area.has-file p {
          color: #FFFFFF !important;
        }

        .file-description {
          font-size: 0.85rem;
          margin-top: 5px;
          margin-bottom: 0;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.7) !important;
        }

        .file-info {
          margin-top: 10px;
          font-size: 0.9rem;
          color: #FFFFFF !important;
          font-weight: 600;
        }

        .error-message {
          background: #872341;
          color: #FFFFFF;
          padding: 1rem;
          border-radius: 0px;
          border: 2px solid #E17564;
          font-size: 0.9rem;
          margin-bottom: 1rem;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .signup-container {
            padding: 30px 20px;
          }

          .signup-header h1 {
            font-size: 1.75rem;
          }

          .personal-info-grid,
          .account-info-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default Signup;  