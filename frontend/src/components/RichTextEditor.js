import React, { useState, useRef, useEffect } from 'react';
import { 
  FaBold, FaItalic, FaUnderline, FaListUl, FaListOl, 
  FaLink, FaImage, FaQuoteLeft, FaCode, FaUndo, FaRedo,
  FaAlignLeft, FaAlignCenter, FaAlignRight, FaAlignJustify,
  FaSubscript, FaSuperscript, FaStrikethrough, FaIndent, FaOutdent,
  FaPaperclip
} from 'react-icons/fa';

const RichTextEditor = ({ value, onChange, onAttachmentsChange, placeholder = "Start typing..." }) => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);
  const [lastValue, setLastValue] = useState('');
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    subscript: false,
    superscript: false
  });

  useEffect(() => {
    const editor = editorRef.current;
    if (editor) {
      const handleSelectionChange = () => {
        checkActiveFormats();
      };
      
      editor.addEventListener('mouseup', handleSelectionChange);
      editor.addEventListener('keyup', handleSelectionChange);
      
      return () => {
        editor.removeEventListener('mouseup', handleSelectionChange);
        editor.removeEventListener('keyup', handleSelectionChange);
      };
    }
  }, []);

  useEffect(() => {
    if (editorRef.current && value !== lastValue) {
      // Handle both JSON format (with attachments) and plain text
      try {
        const parsed = JSON.parse(value);
        if (parsed.text && parsed.attachments) {
          // JSON format with attachments
          if (editorRef.current.innerHTML !== parsed.text) {
            editorRef.current.innerHTML = parsed.text;
          }
          setAttachments(parsed.attachments);
        } else {
          // Plain text fallback
          if (editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value;
          }
        }
      } catch {
        // Plain text format
        if (editorRef.current.innerHTML !== value) {
          editorRef.current.innerHTML = value;
        }
      }
      setLastValue(value);
    }
  }, [value, lastValue]);

  const checkActiveFormats = () => {
    if (editorRef.current) {
      const newFormats = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikethrough'),
        subscript: document.queryCommandState('subscript'),
        superscript: document.queryCommandState('superscript')
      };
      setActiveFormats(newFormats);
    }
  };

  const restoreSelection = () => {
    // Only restore selection if there's no current selection
    if (editorRef.current) {
      const selection = window.getSelection();
      if (selection.rangeCount === 0) {
        editorRef.current.focus();
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        selection.addRange(range);
      }
    }
  };

  const execCommand = (command, value = null) => {
    if (editorRef.current) {
      // Save current selection before focusing
      const selection = window.getSelection();
      let savedRange = null;
      if (selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0);
      }
      
      editorRef.current.focus();
      
      // Restore selection if it was lost
      if (savedRange && selection.rangeCount === 0) {
        selection.addRange(savedRange);
      }
      
      document.execCommand(command, false, value);
      
      // Check active formats after command
      setTimeout(() => {
        checkActiveFormats();
        handleContentChange();
      }, 10);
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      // Only send the text content, not the full JSON with attachments
      if (content !== lastValue) {
        onChange(content);
        setLastValue(content);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          execCommand('bold');
          break;
        case 'i':
          e.preventDefault();
          execCommand('italic');
          break;
        case 'u':
          e.preventDefault();
          execCommand('underline');
          break;
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
          break;
        case 'y':
          e.preventDefault();
          redo();
          break;
      }
    }
  };

  const undo = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('undo', false);
      handleContentChange();
    }
  };

  const redo = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('redo', false);
      handleContentChange();
    }
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const insertImage = () => {
    fileInputRef.current?.click();
  };

  const insertAttachment = () => {
    attachmentInputRef.current?.click();
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const newAttachment = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: event.target.result,
          isImage: file.type.startsWith('image/')
        };
        
        const updatedAttachments = [...attachments, newAttachment];
        setAttachments(updatedAttachments);
        // Don't update the content, just the attachments
      };
      
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
    // Reset the input
    e.target.value = '';
  };

  const removeAttachment = (attachmentId) => {
    const newAttachments = attachments.filter(att => att.id !== attachmentId);
    setAttachments(newAttachments);
    // Don't update the content, just the attachments
  };

  const previewAttachment = (attachment) => {
    setPreviewFile(attachment);
  };

  // Expose attachments to parent component
  useEffect(() => {
    if (onAttachmentsChange && typeof onAttachmentsChange === 'function') {
      onAttachmentsChange(attachments);
    }
  }, [attachments, onAttachmentsChange]);

  const ToolbarButton = ({ onClick, icon: Icon, title, isActive = false }) => (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      title={title}
      className={`toolbar-btn ${isActive ? 'active' : ''}`}
    >
      <Icon size={14} />
    </button>
  );

  return (
    <div className="rich-text-editor">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      
      <input
        ref={attachmentInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileUpload}
        style={{ display: 'none' }}
      />
      
      {/* File Preview Modal */}
      {previewFile && (
        <div className="file-preview-overlay" onClick={() => setPreviewFile(null)}>
          <div className="file-preview-content" onClick={(e) => e.stopPropagation()}>
            {previewFile.isImage ? (
              <img src={previewFile.data} alt={previewFile.name} className="preview-image" />
            ) : (
              <div className="preview-text">
                <h3>{previewFile.name}</h3>
                <div className="file-info">
                  <p><strong>Type:</strong> {previewFile.type}</p>
                  <p><strong>Size:</strong> {(previewFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <div className="file-content">
                  <pre>{previewFile.data}</pre>
                </div>
              </div>
            )}
            <button 
              className="close-preview-modal"
              onClick={() => setPreviewFile(null)}
            >
              ×
            </button>
          </div>
        </div>
      )}
      
      <div className="toolbar">
        <div className="toolbar-group">
          <ToolbarButton
            onClick={undo}
            icon={FaUndo}
            title="Undo (Ctrl+Z)"
          />
          <ToolbarButton
            onClick={redo}
            icon={FaRedo}
            title="Redo (Ctrl+Y)"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => execCommand('bold')}
            icon={FaBold}
            title="Bold (Ctrl+B)"
            isActive={activeFormats.bold}
          />
          <ToolbarButton
            onClick={() => execCommand('italic')}
            icon={FaItalic}
            title="Italic (Ctrl+I)"
            isActive={activeFormats.italic}
          />
          <ToolbarButton
            onClick={() => execCommand('underline')}
            icon={FaUnderline}
            title="Underline (Ctrl+U)"
            isActive={activeFormats.underline}
          />
          <ToolbarButton
            onClick={() => execCommand('strikeThrough')}
            icon={FaStrikethrough}
            title="Strikethrough"
            isActive={activeFormats.strikethrough}
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => execCommand('justifyLeft')}
            icon={FaAlignLeft}
            title="Align Left"
          />
          <ToolbarButton
            onClick={() => execCommand('justifyCenter')}
            icon={FaAlignCenter}
            title="Align Center"
          />
          <ToolbarButton
            onClick={() => execCommand('justifyRight')}
            icon={FaAlignRight}
            title="Align Right"
          />
          <ToolbarButton
            onClick={() => execCommand('justifyFull')}
            icon={FaAlignJustify}
            title="Justify"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => execCommand('insertUnorderedList')}
            icon={FaListUl}
            title="Bullet List"
          />
          <ToolbarButton
            onClick={() => execCommand('insertOrderedList')}
            icon={FaListOl}
            title="Numbered List"
          />
          <ToolbarButton
            onClick={() => execCommand('indent')}
            icon={FaIndent}
            title="Indent"
          />
          <ToolbarButton
            onClick={() => execCommand('outdent')}
            icon={FaOutdent}
            title="Outdent"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => execCommand('formatBlock', 'blockquote')}
            icon={FaQuoteLeft}
            title="Quote"
          />
          <ToolbarButton
            onClick={() => execCommand('formatBlock', 'pre')}
            icon={FaCode}
            title="Code Block"
          />
          <ToolbarButton
            onClick={insertLink}
            icon={FaLink}
            title="Insert Link"
          />
          <ToolbarButton
            onClick={insertImage}
            icon={FaImage}
            title="Insert File"
          />
          <ToolbarButton
            onClick={insertAttachment}
            icon={FaPaperclip}
            title="Attach Files"
          />
        </div>

        <div className="toolbar-separator" />

        <div className="toolbar-group">
          <ToolbarButton
            onClick={() => execCommand('subscript')}
            icon={FaSubscript}
            title="Subscript"
            isActive={activeFormats.subscript}
          />
          <ToolbarButton
            onClick={() => execCommand('superscript')}
            icon={FaSuperscript}
            title="Superscript"
            isActive={activeFormats.superscript}
          />
        </div>
      </div>

      <div
        ref={editorRef}
        className={`editor-content ${isFocused ? 'focused' : ''}`}
        contentEditable
        onInput={handleContentChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        data-placeholder={placeholder}
        suppressContentEditableWarning={true}
      />
      
      {/* Attachments Section */}
      {attachments.length > 0 && (
        <div className="attachments-container">
          <div className="attachments-header">
            <span className="attachments-title">Attached Files</span>
          </div>
          <div className="attachments-list">
            {attachments.map((attachment, index) => (
              <div key={attachment.id} className="attachment-pill">
                <span 
                  className="attachment-title"
                  onClick={() => previewAttachment(attachment)}
                >
                  {attachment.isImage ? `Image ${index + 1}` : attachment.name}
                </span>
                <button
                  type="button"
                  className="attachment-remove"
                  onClick={() => removeAttachment(attachment.id)}
                  title="Remove attachment"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .rich-text-editor {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          overflow: hidden;
          background: white;
        }

        .toolbar {
          display: flex;
          align-items: center;
          padding: 8px 12px;
          background: #f8f9fa;
          border-bottom: 1px solid #e5e7eb;
          flex-wrap: wrap;
          gap: 4px;
        }

        .toolbar-group {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .toolbar-separator {
          width: 1px;
          height: 20px;
          background: #d1d5db;
          margin: 0 8px;
        }

        .toolbar-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          color: #6b7280;
          transition: all 0.2s;
        }

        .toolbar-btn:hover {
          background: #e5e7eb;
          color: #374151;
        }

        .toolbar-btn.active {
          background: #3b82f6;
          color: white;
        }

        .editor-content {
          min-height: 200px;
          max-height: 400px;
          overflow-y: auto;
          padding: 16px;
          font-size: 14px;
          line-height: 1.6;
          outline: none;
          position: relative;
          width: 100%;
          box-sizing: border-box;
          font-family: inherit;
          border: none;
        }

        .editor-content:focus {
          outline: none;
          box-shadow: none;
          border: none;
        }

        .editor-content:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }

        .editor-content.focused {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .editor-content h1,
        .editor-content h2,
        .editor-content h3,
        .editor-content h4,
        .editor-content h5,
        .editor-content h6 {
          margin: 16px 0 8px 0;
          font-weight: 600;
        }

        .editor-content h1 { font-size: 24px; }
        .editor-content h2 { font-size: 20px; }
        .editor-content h3 { font-size: 18px; }
        .editor-content h4 { font-size: 16px; }
        .editor-content h5 { font-size: 14px; }
        .editor-content h6 { font-size: 12px; }

        .editor-content p {
          margin: 8px 0;
        }

        .editor-content div {
          display: block;
        }

        .editor-content ul,
        .editor-content ol {
          margin: 8px 0;
          padding-left: 24px;
        }

        .editor-content li {
          margin: 4px 0;
        }

        .editor-content blockquote {
          margin: 16px 0;
          padding: 12px 16px;
          border-left: 4px solid #e5e7eb;
          background: #f9fafb;
          font-style: italic;
        }

        .editor-content pre {
          margin: 16px 0;
          padding: 12px;
          background: #f3f4f6;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          overflow-x: auto;
        }

        .editor-content code {
          background: #f3f4f6;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
        }

        .editor-content a {
          color: #3b82f6;
          text-decoration: underline;
        }

        .editor-content a:hover {
          color: #2563eb;
        }

        .editor-content img {
          max-width: 200px;
          max-height: 150px;
          object-fit: cover;
          border-radius: 8px;
          margin: 8px auto;
          cursor: pointer;
          display: block;
          position: relative;
        }

        .image-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          cursor: pointer;
        }

        .image-modal-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          cursor: default;
        }

        .enlarged-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
        }

        .close-image-modal {
          position: absolute;
          top: -40px;
          right: 0;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #374151;
        }

        .close-preview-modal {
          position: absolute;
          top: -40px;
          right: 0;
          background: rgba(255, 255, 255, 0.9);
          border: none;
          border-radius: 50%;
          width: 32px;
          height: 32px;
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #374151;
        }

        .close-preview-modal:hover {
          background: white;
        }

        .file-preview-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          cursor: pointer;
        }

        .file-preview-content {
          position: relative;
          max-width: 90vw;
          max-height: 90vh;
          cursor: default;
          background: white;
          border-radius: 8px;
          padding: 20px;
          overflow-y: auto;
        }

        .preview-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
        }

        .preview-text h3 {
          margin: 0 0 16px 0;
          color: #1f2937;
        }

        .file-info {
          margin-bottom: 16px;
          padding: 12px;
          background: #f3f4f6;
          border-radius: 6px;
        }

        .file-info p {
          margin: 4px 0;
          font-size: 14px;
          color: #374151;
        }

        .file-content {
          max-height: 400px;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 12px;
          background: #fafafa;
        }

        .file-content pre {
          margin: 0;
          font-family: 'Courier New', monospace;
          font-size: 12px;
          line-height: 1.4;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .attachments-container {
          border-top: 1px solid #e5e7eb;
          padding: 12px 16px;
          background: #f9fafb;
          border-radius: 0 0 8px 8px;
        }

        .attachments-header {
          margin-bottom: 8px;
        }

        .attachments-title {
          font-size: 12px;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .attachments-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .attachment-pill {
          display: flex;
          align-items: center;
          background: #3b82f6;
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .attachment-pill:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .attachment-title {
          margin-right: 4px;
          cursor: pointer;
          text-decoration: underline;
        }

        .attachment-remove {
          background: none;
          border: none;
          color: white;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: background 0.2s;
        }

        .attachment-remove:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .editor-content strong {
          font-weight: 600;
        }

        .editor-content em {
          font-style: italic;
        }

        .editor-content u {
          text-decoration: underline;
        }

        .editor-content s {
          text-decoration: line-through;
        }

        .editor-content sub {
          vertical-align: sub;
          font-size: 0.8em;
        }

        .editor-content sup {
          vertical-align: super;
          font-size: 0.8em;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
