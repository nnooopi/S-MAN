import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaBullhorn, FaTag, FaSave, FaPaperclip, FaImage, FaFile, FaTrash } from 'react-icons/fa';
import RichTextEditor from './RichTextEditor';

const AnnouncementModal = ({ announcement, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'general'
  });
  const [files, setFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title || '',
        content: announcement.content || '',
        type: announcement.type || 'general'
      });
    }
  }, [announcement]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = selectedFiles.map(file => ({
      file,
      id: Date.now() + Math.random(),
      name: file.name,
      size: file.size,
      type: file.type,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setFiles(prev => {
      const updatedFiles = prev.filter(f => f.id !== fileId);
      // Revoke object URL to prevent memory leaks
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updatedFiles;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('content', formData.content);
      formDataToSend.append('type', formData.type);

      // Add files from both sources
      files.forEach(fileObj => {
        formDataToSend.append('files', fileObj.file);
      });
      
      // Add attachments from rich text editor
      const attachmentPromises = attachments.map(async (attachment) => {
        // Convert data URL back to file if needed
        if (attachment.data && attachment.data.startsWith('data:')) {
          const response = await fetch(attachment.data);
          const blob = await response.blob();
          const file = new File([blob], attachment.name, { type: attachment.type });
          return file;
        }
        return null;
      });
      
      const attachmentFiles = await Promise.all(attachmentPromises);
      attachmentFiles.forEach(file => {
        if (file) {
          formDataToSend.append('files', file);
        }
      });

      onSave(formDataToSend);
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Error submitting announcement');
    } finally {
      setUploading(false);
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
        maxWidth: '980px',
        maxHeight: '86vh',
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
        {/* Crosshair corners */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '20px',
          height: '20px',
          borderLeft: '2px solid rgb(135, 35, 65)',
          borderTop: '2px solid rgb(135, 35, 65)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '20px',
          height: '20px',
          borderRight: '2px solid rgb(135, 35, 65)',
          borderTop: '2px solid rgb(135, 35, 65)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '20px',
          height: '20px',
          borderLeft: '2px solid rgb(135, 35, 65)',
          borderBottom: '2px solid rgb(135, 35, 65)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '20px',
          height: '20px',
          borderRight: '2px solid rgb(135, 35, 65)',
          borderBottom: '2px solid rgb(135, 35, 65)',
          pointerEvents: 'none'
        }} />

        {/* Header */}
        <div style={{
          padding: '1.5rem',
          borderBottom: '2px solid rgb(135, 35, 65)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgb(255, 255, 255)'
        }}>
          <h2 style={{
            margin: 0,
            color: 'rgb(135, 35, 65)',
            fontWeight: 700,
            fontSize: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <FaBullhorn size={20} />
            {announcement ? 'Edit Announcement' : 'Create New Announcement'}
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0.5rem',
              borderRadius: '6px',
              color: 'rgb(135, 35, 65)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(135, 35, 65, 0.1)';
              e.target.style.transform = 'rotate(90deg)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'none';
              e.target.style.transform = 'rotate(0deg)';
            }}
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Form */}
        <form 
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            background: 'rgb(255, 255, 255)',
            padding: '1.5rem'
          }}
        >
          {/* Title Field */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label 
              htmlFor="title"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: 'rgb(50, 50, 50)'
              }}
            >
              Title <span style={{ color: 'rgb(220, 38, 38)' }}>*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Enter announcement title"
              required
              maxLength={200}
              className="announcement-modal-input"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1px solid rgb(229, 231, 235)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease',
                background: 'rgb(255, 255, 255)',
                color: 'rgb(50, 50, 50)',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgb(135, 35, 65)';
                e.target.style.boxShadow = '0 0 0 3px rgba(135, 35, 65, 0.1)';
                e.target.style.background = 'rgb(255, 255, 255)';
                e.target.style.color = 'rgb(50, 50, 50)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgb(229, 231, 235)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'rgb(255, 255, 255)';
                e.target.style.color = 'rgb(50, 50, 50)';
              }}
            />
          </div>

          {/* Type Field */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label 
              htmlFor="type"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: 'rgb(50, 50, 50)'
              }}
            >
              Type
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="announcement-modal-select"
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                border: '1px solid rgb(229, 231, 235)',
                borderRadius: '6px',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease',
                background: 'rgb(255, 255, 255)',
                color: 'rgb(50, 50, 50)',
                outline: 'none',
                cursor: 'pointer'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'rgb(135, 35, 65)';
                e.target.style.boxShadow = '0 0 0 3px rgba(135, 35, 65, 0.1)';
                e.target.style.background = 'rgb(255, 255, 255)';
                e.target.style.color = 'rgb(50, 50, 50)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'rgb(229, 231, 235)';
                e.target.style.boxShadow = 'none';
                e.target.style.background = 'rgb(255, 255, 255)';
                e.target.style.color = 'rgb(50, 50, 50)';
              }}
            >
              <option value="general">General</option>
              <option value="important">Important</option>
              <option value="reminder">Reminder</option>
              <option value="update">Update</option>
              <option value="deadline">Deadline</option>
            </select>
          </div>

          {/* Content Field */}
          <div style={{ marginBottom: '1.25rem', flex: 1 }}>
            <label 
              htmlFor="content"
              style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 600,
                fontSize: '0.875rem',
                color: 'rgb(50, 50, 50)'
              }}
            >
              Content <span style={{ color: 'rgb(220, 38, 38)' }}>*</span>
            </label>
            <RichTextEditor
              value={formData.content}
              onChange={(content) => setFormData(prev => ({ ...prev, content }))}
              onAttachmentsChange={setAttachments}
              placeholder="Enter announcement content..."
            />
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'flex-end',
            paddingTop: '1.25rem',
            borderTop: '1px solid rgb(229, 231, 235)'
          }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'transparent',
                color: 'rgb(135, 35, 65)',
                border: '2px solid rgb(135, 35, 65)'
              }}
              onMouseEnter={(e) => e.target.style.background = 'rgba(135, 35, 65, 0.1)'}
              onMouseLeave={(e) => e.target.style.background = 'transparent'}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={uploading}
              style={{
                padding: '0.625rem 1.25rem',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: uploading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgb(135, 35, 65)',
                color: 'white',
                border: '2px solid rgb(135, 35, 65)',
                opacity: uploading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.target.style.background = 'rgb(115, 25, 55)';
                  e.target.style.borderColor = 'rgb(115, 25, 55)';
                }
              }}
              onMouseLeave={(e) => {
                if (!uploading) {
                  e.target.style.background = 'rgb(135, 35, 65)';
                  e.target.style.borderColor = 'rgb(135, 35, 65)';
                }
              }}
            >
              <FaSave size={14} />
              {uploading ? 'Saving...' : (announcement ? 'Update Announcement' : 'Create Announcement')}
            </button>
          </div>
        </form>
      </div>

      {/* Style override for inputs and selects */}
      <style>{`
        input[type="text"].announcement-modal-input,
        select.announcement-modal-select {
          background: rgb(255, 255, 255) !important;
          color: rgb(50, 50, 50) !important;
          border: 1px solid rgb(229, 231, 235) !important;
        }
        input[type="text"].announcement-modal-input:focus,
        select.announcement-modal-select:focus {
          background: rgb(255, 255, 255) !important;
          color: rgb(50, 50, 50) !important;
          border-color: rgb(135, 35, 65) !important;
          box-shadow: 0 0 0 3px rgba(135, 35, 65, 0.1) !important;
          outline: none !important;
        }
        input[type="text"].announcement-modal-input::placeholder {
          color: rgb(156, 163, 175) !important;
        }
      `}</style>
    </div>
  );
};

export default AnnouncementModal;
