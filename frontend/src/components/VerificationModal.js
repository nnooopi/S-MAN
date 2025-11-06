import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, Clock, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const VerificationModal = ({ verificationId, email, onClose }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(30);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setError('Verification code has expired. Please sign up again.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const resendTimer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(resendTimer);
  }, [resendCount]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔍 Verifying code:', { verificationId, code });
      
      const response = await axios.post('/api/verify-code', {
        verificationId,
        code
      });

      console.log('✅ Verification successful:', response.data);
      setSuccess('Account created successfully! Your account is pending approval.');
      
      setTimeout(() => {
        onClose();
        navigate('/signin');
      }, 2000);
    } catch (error) {
      console.error('❌ Verification failed:', error);
      const errorMessage = error.response?.data?.error || 'Verification failed';
      setError(errorMessage);
      
      // If it's an attempt error, show attempts left
      if (error.response?.data?.attemptsLeft !== undefined) {
        setError(`${errorMessage} (${error.response.data.attemptsLeft} attempts left)`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || resendCount >= 3) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔄 Requesting resend for:', verificationId);
      
      const response = await axios.post('/api/resend-code', { verificationId });
      
      console.log('✅ Resend successful:', response.data);
      setResendCount(prev => prev + 1);
      setCanResend(false);
      setResendCooldown(30);
      setSuccess('New verification code sent to your email');
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('❌ Resend failed:', error);
      setError(error.response?.data?.error || 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="verification-header">
          <Mail size={48} color="#007bff" />
          <h2>Verify Your Email</h2>
          <p>Please enter the verification code sent to:</p>
          <strong>{email}</strong>
        </div>

        <form onSubmit={handleVerify} className="verification-form">
          <div className="form-group">
            <label className="form-label">Verification Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="form-input verification-code-input"
              placeholder="000000"
              maxLength="6"
              required
              autoComplete="one-time-code"
            />
          </div>

          <div className="time-info">
            <Clock size={16} />
            <span>Time remaining: {formatTime(timeLeft)}</span>
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}
          
          {success && (
            <div className="success-message">
              <CheckCircle size={16} />
              {success}
            </div>
          )}

          <div className="verification-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || code.length !== 6 || timeLeft === 0}
            >
              {loading ? (
                <div className="loading">
                  <div className="spinner"></div>
                  Verifying...
                </div>
              ) : (
                'Verify Code'
              )}
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResend}
              disabled={!canResend || resendCount >= 3 || loading}
            >
              <RefreshCw size={16} />
              {canResend ? (
                resendCount >= 3 ? 'Max attempts reached' : 'Resend Code'
              ) : (
                `Resend in ${resendCooldown}s`
              )}
            </button>
          </div>

          <div className="resend-info">
            <p>Resend attempts: {resendCount}/3</p>
          </div>
        </form>

        <button className="modal-close" onClick={onClose}>×</button>

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

          .modal {
            background: white;
            border-radius: 12px;
            padding: 30px;
            max-width: 450px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            position: relative;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
          }

          .verification-header {
            text-align: center;
            margin-bottom: 30px;
          }

          .verification-header h2 {
            margin: 20px 0 10px;
            color: #333;
            font-size: 1.5rem;
          }

          .verification-header p {
            color: #666;
            margin-bottom: 5px;
          }

          .verification-header strong {
            color: #007bff;
            word-break: break-all;
          }

          .verification-form {
            width: 100%;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-label {
            display: block;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
          }

          .form-input {
            width: 100%;
            padding: 12px 16px;
            border: 2px solid #e1e5e9;
            border-radius: 8px;
            font-size: 16px;
            transition: all 0.3s ease;
            box-sizing: border-box;
          }

          .form-input:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
          }

          .verification-code-input {
            font-size: 24px;
            letter-spacing: 8px;
            text-align: center;
            font-weight: bold;
          }

          .time-info {
            display: flex;
            align-items: center;
            gap: 8px;
            justify-content: center;
            margin: 15px 0;
            color: #666;
            font-size: 14px;
          }

          .error-message {
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: #fee;
            color: #c33;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #fcc;
            font-size: 14px;
            margin: 15px 0;
          }

          .success-message {
            display: flex;
            align-items: center;
            gap: 8px;
            background-color: #f0f8ff;
            color: #0066cc;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid #b3d9ff;
            font-size: 14px;
            margin: 15px 0;
          }

          .verification-actions {
            display: flex;
            flex-direction: column;
            gap: 15px;
            margin-top: 20px;
          }

          .btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 12px 24px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }

          .btn-primary {
            background: #007bff;
            color: white;
          }

          .btn-primary:hover:not(:disabled) {
            background: #0056b3;
          }

          .btn-secondary {
            background: #6c757d;
            color: white;
          }

          .btn-secondary:hover:not(:disabled) {
            background: #545b62;
          }

          .loading {
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid transparent;
            border-top: 2px solid currentColor;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .resend-info {
            text-align: center;
            margin-top: 15px;
            font-size: 14px;
            color: #666;
          }

          .modal-close {
            position: absolute;
            top: 15px;
            right: 20px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
            padding: 5px;
            border-radius: 50%;
            width: 35px;
            height: 35px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .modal-close:hover {
            color: #333;
            background: #f0f0f0;
          }

          @media (max-width: 480px) {
            .modal {
              padding: 20px;
              margin: 20px;
            }

            .verification-code-input {
              font-size: 20px;
              letter-spacing: 4px;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default VerificationModal;