import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaEdit, FaTrash, FaReply, FaUser } from 'react-icons/fa';

const AnnouncementComments = ({ 
  announcementId, 
  comments = [], 
  currentUser, 
  onAddComment, 
  onUpdateComment, 
  onDeleteComment 
}) => {
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyContent, setReplyContent] = useState('');
  const commentsEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [comments]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newComment, replyContent]);

  const scrollToBottom = () => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await onAddComment({
        content: newComment.trim(),
        parent_comment_id: replyingTo?.id || null
      });
      setNewComment('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleSubmitReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    try {
      await onAddComment({
        content: replyContent.trim(),
        parent_comment_id: replyingTo.id
      });
      setReplyContent('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleEditComment = (comment) => {
    setEditingComment(comment);
    setEditContent(comment.content);
  };

  const handleUpdateComment = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) return;

    try {
      await onUpdateComment(editingComment.id, editContent.trim());
      setEditingComment(null);
      setEditContent('');
    } catch (error) {
      console.error('Error updating comment:', error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Are you sure you want to delete this comment?')) {
      try {
        await onDeleteComment(commentId);
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const formatTimeAgo = (dateString) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  };

  const getProfileImage = (user) => {
    if (user?.profile_image_url) {
      // Check if it's already a full URL
      if (user.profile_image_url.startsWith('http') || user.profile_image_url.startsWith('/api/')) {
        return user.profile_image_url;
      }
      
      // The stored path might be just the filename or full path
      // If it contains a slash, it's already a full path
      if (user.profile_image_url.includes('/')) {
        return `/api/files/${user.profile_image_url}`;
      } else {
        // If it's just a filename, construct the path with user ID
        return `/api/files/${user.id}/${user.profile_image_url}`;
      }
    }
    return null;
  };

  const getUserDisplayName = (user) => {
    if (!user) return 'Unknown User';
    return `${user.first_name} ${user.last_name}`;
  };

  const getUserRole = (userType) => {
    return userType === 'professor' ? 'Professor' : 'Student';
  };

  const CommentItem = ({ comment, isReply = false }) => {
    const isOwner = comment.user_id === currentUser?.id;
    const isEditing = editingComment?.id === comment.id;

    return (
      <div className={`comment-item ${isReply ? 'reply' : ''}`}>
        <div className="comment-avatar">
          {getProfileImage(comment.user) ? (
            <img 
              src={getProfileImage(comment.user)} 
              alt={getUserDisplayName(comment.user)}
              className="avatar-image"
            />
          ) : (
            <div className="avatar-placeholder">
              <FaUser size={16} />
            </div>
          )}
        </div>

        <div className="comment-content">
          <div className="comment-header">
            <div className="comment-author">
              <span className="author-name">{getUserDisplayName(comment.user)}</span>
              <span className="author-role">{getUserRole(comment.user_type)}</span>
            </div>
            <div className="comment-meta">
              <span className="comment-time">{formatTimeAgo(comment.created_at)}</span>
              {comment.is_edited && (
                <span className="edited-indicator">(edited)</span>
              )}
            </div>
          </div>

          {isEditing ? (
            <form onSubmit={handleUpdateComment} className="edit-form">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="edit-textarea"
                rows={3}
                autoFocus
              />
              <div className="edit-actions">
                <button type="submit" className="btn btn-primary btn-sm">
                  Save
                </button>
                <button 
                  type="button" 
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    setEditingComment(null);
                    setEditContent('');
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="comment-text">
                {comment.content}
              </div>
              
              <div className="comment-actions">
                {!isReply && (
                  <button
                    className="action-btn"
                    onClick={() => setReplyingTo(comment)}
                  >
                    <FaReply size={12} />
                    Reply
                  </button>
                )}
                {isOwner && (
                  <>
                    <button
                      className="action-btn"
                      onClick={() => handleEditComment(comment)}
                    >
                      <FaEdit size={12} />
                      Edit
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <FaTrash size={12} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const ReplyForm = ({ parentComment, onCancel }) => (
    <div className="reply-form">
      <div className="reply-avatar">
        {getProfileImage(currentUser) ? (
          <img 
            src={getProfileImage(currentUser)} 
            alt={getUserDisplayName(currentUser)}
            className="avatar-image"
          />
        ) : (
          <div className="avatar-placeholder">
            <FaUser size={16} />
          </div>
        )}
      </div>
      <form onSubmit={handleSubmitReply} className="reply-content">
        <div className="reply-header">
          <span>Replying to {getUserDisplayName(parentComment.user)}</span>
          <button
            type="button"
            className="cancel-reply"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        <textarea
          ref={textareaRef}
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder="Write a reply..."
          className="reply-textarea"
          rows={2}
        />
        <div className="reply-actions">
          <button type="submit" className="btn btn-primary btn-sm">
            <FaPaperPlane size={12} />
            Reply
          </button>
          <button 
            type="button" 
            className="btn btn-outline btn-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // Group comments by parent
  const topLevelComments = comments.filter(comment => !comment.parent_comment_id);
  const replies = comments.filter(comment => comment.parent_comment_id);

  return (
    <div className="announcement-comments">
      <div className="comments-list">
        {topLevelComments.map(comment => (
          <div key={comment.id} className="comment-thread">
            <CommentItem comment={comment} />
            
            {/* Show replies */}
            {replies
              .filter(reply => reply.parent_comment_id === comment.id)
              .map(reply => (
                <CommentItem key={reply.id} comment={reply} isReply={true} />
              ))}
            
            {/* Reply form */}
            {replyingTo?.id === comment.id && (
              <ReplyForm 
                parentComment={comment} 
                onCancel={() => setReplyingTo(null)} 
              />
            )}
          </div>
        ))}

        {comments.length === 0 && (
          <div className="no-comments">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        )}

        <div ref={commentsEndRef} />
      </div>

      {/* New comment form */}
      <form onSubmit={handleSubmitComment} className="new-comment-form">
        <div className="comment-input-row">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="comment-textarea"
            rows={2}
          />
          <button 
            type="submit" 
            className="comment-submit-btn"
            disabled={!newComment.trim()}
            title="Post comment"
          >
            <FaPaperPlane size={16} />
          </button>
        </div>
      </form>

      <style>{`
        .announcement-comments {
          background: white;
          border: 2px solid #EBE5C2;
          border-radius: 12px;
          padding: 20px;
        }
        .announcement-comments {
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }

        .comments-header {
          margin-bottom: 16px;
        }

        .comments-header h4 {
          margin: 0;
          color: #374151;
          font-size: 16px;
          font-weight: 600;
        }

        .comments-list {
          max-height: 400px;
          overflow-y: auto;
          margin-bottom: 20px;
        }

        .comment-thread {
          margin-bottom: 16px;
        }

        .comment-item {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .comment-item.reply {
          margin-left: 48px;
          margin-bottom: 8px;
        }

        .comment-avatar {
          flex-shrink: 0;
        }

        .avatar-image {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
        }

        .comment-content {
          flex: 1;
          min-width: 0;
        }

        .comment-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 4px;
        }

        .comment-author {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .author-name {
          font-weight: 500;
          color: #374151;
          font-size: 14px;
        }

        .author-role {
          font-size: 12px;
          color: #6b7280;
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .comment-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: #6b7280;
        }

        .edited-indicator {
          font-style: italic;
        }

        .comment-text {
          color: #374151;
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 8px;
          white-space: pre-wrap;
        }

        .comment-actions {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: #6b7280;
          font-size: 12px;
          cursor: pointer;
          padding: 4px 0;
          transition: color 0.2s;
        }

        .action-btn:hover {
          color: #374151;
        }

        .action-btn.danger:hover {
          color: #ef4444;
        }

        .edit-form {
          margin-top: 8px;
        }

        .edit-textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          resize: vertical;
          min-height: 60px;
          font-family: inherit;
        }

        .edit-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .reply-form {
          display: flex;
          gap: 12px;
          margin-top: 8px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .reply-avatar {
          flex-shrink: 0;
        }

        .reply-content {
          flex: 1;
        }

        .reply-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
          font-size: 12px;
          color: #6b7280;
        }

        .cancel-reply {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          font-size: 16px;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .reply-textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          resize: none;
          font-family: inherit;
        }

        .reply-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .reply-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .no-comments {
          text-align: center;
          padding: 40px 20px;
          color: #6b7280;
        }

        .new-comment-form {
          padding: 16px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .comment-input-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .comment-textarea {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          resize: none;
          font-family: inherit;
          min-height: 40px;
          line-height: 1.4;
        }

        .comment-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .comment-submit-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: #3b82f6;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
          align-self: flex-start;
          margin-top: 1px;
        }

        .comment-submit-btn:hover:not(:disabled) {
          background: #2563eb;
          transform: scale(1.05);
        }

        .comment-submit-btn:disabled {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }

        .btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          border-color: #2563eb;
        }

        .btn-primary:disabled {
          background: #9ca3af;
          border-color: #9ca3af;
          cursor: not-allowed;
        }

        .btn-outline {
          background: white;
          color: #374151;
          border-color: #d1d5db;
        }

        .btn-outline:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .btn-sm {
          padding: 4px 8px;
          font-size: 11px;
        }
      `}</style>
    </div>
  );
};

export default AnnouncementComments;
