import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import FaultyTerminal from './FaultyTerminal';

const Signin = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

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
  ), []); // Empty dependency array means this will only be created once

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post('/api/signin', formData);
      
      // Store authentication data
      localStorage.setItem('token', response.data.token);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      // Redirect based on user type
      if (response.data.user.userType === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      setError(error.response?.data?.error || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-page">
      {/* FaultyTerminal Background */}
      <div className="terminal-background">
        {terminalComponent}
      </div>
      
      {/* Simple Sign In Card */}
      <div className="signin-card">
        {/* Crosshair Corners */}
        {/* Top-left */}
        <div className="crosshair-corner top-left">
          <div className="crosshair-h"></div>
          <div className="crosshair-v"></div>
        </div>
        
        {/* Top-right */}
        <div className="crosshair-corner top-right">
          <div className="crosshair-h"></div>
          <div className="crosshair-v"></div>
        </div>
        
        {/* Bottom-left */}
        <div className="crosshair-corner bottom-left">
          <div className="crosshair-h"></div>
          <div className="crosshair-v"></div>
        </div>
        
        {/* Bottom-right */}
        <div className="crosshair-corner bottom-right">
          <div className="crosshair-h"></div>
          <div className="crosshair-v"></div>
        </div>
        
        <div className="card-header">
          <img src="/S-MAN-LOGO-WHITE.png" alt="S-MAN Logo" className="logo" />
        </div>
        <div className="form-title">
          <h1>Sign In</h1>
          <p>Welcome back! Please enter your credentials.</p>
        </div>

        <form onSubmit={handleSubmit} className="signin-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="signin-input"
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="signin-input"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="signin-btn"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="card-footer">
          <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>
      </div>

      <style>{`
        .signin-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #09122C;
          padding: 2rem;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          position: relative;
        }

        .terminal-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: auto;
        }

        .signin-card {
          width: 100%;
          max-width: 400px;
          background: #09122C;
          border-radius: 0px;
          border: 2px solid #872341;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 2;
          padding: 2rem;
        }

        .card-header {
          text-align: center;
          margin-bottom: 1rem;
          background: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .crosshair-corner {
          position: absolute;
          width: 20px;
          height: 20px;
          pointer-events: none;
        }

        .crosshair-corner.top-left {
          top: -10px;
          left: -10px;
        }

        .crosshair-corner.top-right {
          top: -10px;
          right: -10px;
        }

        .crosshair-corner.bottom-left {
          bottom: -10px;
          left: -10px;
        }

        .crosshair-corner.bottom-right {
          bottom: -10px;
          right: -10px;
        }

        .crosshair-h {
          position: absolute;
          left: 0;
          top: 9px;
          height: 2px;
          width: 20px;
          background: #FFFFFF;
        }

        .crosshair-v {
          position: absolute;
          left: 9px;
          top: 0;
          width: 2px;
          height: 20px;
          background: #FFFFFF;
        }

        /* Top-left adjustments */
        .crosshair-corner.top-left .crosshair-h {
          left: 0;
          top: auto;
          bottom: 9px;
        }

        .crosshair-corner.top-left .crosshair-v {
          left: 9px;
          top: auto;
          bottom: 0;
        }

        /* Top-right adjustments */
        .crosshair-corner.top-right .crosshair-h {
          right: 0;
          left: auto;
          top: auto;
          bottom: 9px;
        }

        .crosshair-corner.top-right .crosshair-v {
          right: 9px;
          left: auto;
          top: auto;
          bottom: 0;
        }

        /* Bottom-left adjustments */
        .crosshair-corner.bottom-left .crosshair-h {
          left: 0;
        }

        .crosshair-corner.bottom-left .crosshair-v {
          left: 9px;
        }

        .logo {
          height: 40px;
          width: auto;
          margin-bottom: 0;
        }

        .form-title {
          text-align: center;
          margin-bottom: 2rem;
        }

        .form-title h1 {
          font-family: 'Georgia', serif;
          font-size: 1.75rem;
          font-weight: 700;
          color: #FFFFFF !important;
          margin: 0 0 0.5rem 0;
        }

        .form-title p {
          color: #FFFFFF !important;
          font-size: 0.9rem;
          margin: 0;
          font-weight: 500;
          opacity: 0.9;
        }

        .signin-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-weight: 600;
          color: #FFFFFF !important;
          font-size: 0.9rem;
        }
 
        .signin-input {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #872341;
          border-radius: 0px;
          font-size: 1rem;
          transition: border-color 0.3s ease;
          box-sizing: border-box;
          background: #09122C !important;
          color: #FFFFFF !important;
        }

        .signin-input:focus {
          outline: none;
          border-color: #E17564;
          background: #09122C !important;
          color: #FFFFFF !important;
        }

        .signin-input::placeholder {
          color: #888888 !important;
          opacity: 1 !important;
        }

        .password-field {
          position: relative;
        }

        .show-password {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #BE3144;
          cursor: pointer;
          padding: 4px;
        }

        .show-password:hover {
          color: #872341;
        }

        .signin-btn {
          width: 100%;
          padding: 0.75rem;
          background: #09122C;
          color: white;
          border: 2px solid #872341;
          border-radius: 0px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 0.5rem;
        }

        .signin-btn:hover:not(:disabled) {
          background: #872341;
          border-color: #872341;
        }

        .signin-btn:disabled {
          background: #872341;
          opacity: 0.7;
          cursor: not-allowed;
        }

        .card-footer {
          margin-top: 1.5rem;
          text-align: center;
        }

        .card-footer p {
          color: #FFFFFF;
          font-size: 0.9rem;
          margin: 0 0 0.75rem 0;
        }

        .card-footer a {
          color: #BE3144;
          text-decoration: none;
          font-weight: 600;
        }

        .card-footer a:hover {
          text-decoration: underline;
          color: #FFFFFF;
        }

        .back-link {
          color: #BE3144;
          text-decoration: none;
          font-size: 0.85rem;
        }

        .back-link:hover {
          color: #E17564;
          text-decoration: underline;
        }

        .error-message {
          background: #872341;
          color: #FFFFFF;
          padding: 0.75rem;
          border-radius: 0px;
          border: 2px solid #E17564;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }

        @media (max-width: 480px) {
          .signin-page {
            padding: 1rem;
          }

          .signin-card {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Signin;