import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const WarningModal = ({ message, onClose, onConfirm, showConfirm = false, confirmText = "Confirm", cancelText = "Cancel" }) => {
  return (
    <div className="modal-overlay">
      <div className="warning-modal">
        <div className="modal-header">
          <div className="header-content">
            <div className="warning-icon">
              <AlertTriangle size={24} />
            </div>
            <h3>Warning</h3>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          <p>{message}</p>
        </div>

        <div className="modal-footer">
          {showConfirm ? (
            <>
              <button className="btn btn-secondary" onClick={onClose}>
                {cancelText}
              </button>
              <button className="btn btn-danger" onClick={onConfirm}>
                {confirmText}
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={onClose}>
              OK
            </button>
          )}
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .warning-modal {
          width: 90%;
          max-width: 500px;
          background: rgba(9, 18, 44, 0.15);
          border: none;
          box-shadow: rgba(0, 0, 0, 0.5) 0px 4px 12px;
          backdrop-filter: blur(3.2px) saturate(120%);
          border-radius: 0px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          background: white;
          border-bottom: 2px solid rgb(135, 35, 65);
          padding: 1.5rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .warning-icon {
          color: #f59e0b;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: rgb(20, 30, 60);
        }

        .close-button {
          background: transparent;
          border: none;
          color: rgb(20, 30, 60);
          cursor: pointer;
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: background 0.2s;
        }

        .close-button:hover {
          background: rgba(135, 35, 65, 0.1);
          transform: rotate(90deg);
        }

        .modal-content {
          padding: 2rem;
          background: rgb(20, 30, 60);
          flex: 1;
        }

        .modal-content p {
          margin: 0;
          color: white;
          font-size: 1rem;
          line-height: 1.6;
        }

        .modal-footer {
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          padding: 1.5rem 2rem;
          background: rgb(20, 30, 60);
          display: flex;
          gap: 1rem;
          justify-content: flex-end;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-primary {
          background: rgb(135, 35, 65);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: rgb(110, 25, 50);
        }

        .btn-secondary {
          background: transparent;
          color: white;
          border: 1px solid rgb(135, 35, 65);
        }

        .btn-secondary:hover:not(:disabled) {
          background: rgba(135, 35, 65, 0.1);
        }

        .btn-danger {
          background: rgb(244, 67, 54);
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: rgb(211, 47, 47);
        }

        @media (max-width: 768px) {
          .warning-modal {
            width: 95%;
          }
          
          .modal-footer {
            flex-direction: column;
          }
          
          .btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default WarningModal;
