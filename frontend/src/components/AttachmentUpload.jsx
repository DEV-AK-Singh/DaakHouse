import React, { useRef, useState } from 'react';
import { formatFileSize, getFileIcon } from '../utils/attachmentUtils';

function AttachmentUpload({ onAttachmentsChange, maxSizeMB = 10, maxFiles = 10 }) {
  const fileInputRef = useRef();
  const [attachments, setAttachments] = useState([]);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (files) => {
    const newAttachments = Array.from(files).map(file => {
      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        alert(`File "${file.name}" exceeds the maximum size of ${maxSizeMB}MB`);
        return null;
      }

      // Validate file type (basic check)
      if (file.type.startsWith('application/') || 
          file.type.startsWith('image/') || 
          file.type.startsWith('text/') ||
          file.type === '') { // Allow files without type
        return {
          file,
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          size: file.size,
          type: file.type,
          uploadProgress: 0
        };
      } else {
        alert(`File type not supported: ${file.name}`);
        return null;
      }
    }).filter(Boolean);

    if (newAttachments.length === 0) return;

    // Check total file count
    if (attachments.length + newAttachments.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const updatedAttachments = [...attachments, ...newAttachments];
    setAttachments(updatedAttachments);
    onAttachmentsChange(updatedAttachments);
  };

  const handleFileInputChange = (event) => {
    handleFileSelect(event.target.files);
    // Reset input to allow selecting same files again
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    handleFileSelect(event.dataTransfer.files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragOver(false);
  };

  const removeAttachment = (id) => {
    const updatedAttachments = attachments.filter(att => att.id !== id);
    setAttachments(updatedAttachments);
    onAttachmentsChange(updatedAttachments);
  };

  const totalSize = attachments.reduce((sum, att) => sum + att.size, 0);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Attachments ({attachments.length}/{maxFiles})
        </label>
        
        {/* Drag and Drop Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileInputChange}
            multiple
            className="hidden"
          />
          
          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          
          <p className="text-sm text-gray-600 mb-1">
            <span className="text-blue-600 font-medium">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">
            Maximum {maxFiles} files, {maxSizeMB}MB each
          </p>
        </div>

        {/* Size Summary */}
        {attachments.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            Total size: {formatFileSize(totalSize)}
          </div>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Selected Files:</h4>
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="text-xl shrink-0">
                  {getFileIcon(attachment.name, attachment.type)}
                </span>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.name}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.size)}</span>
                    <span>{attachment.type || 'Unknown type'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAttachment(attachment.id);
                }}
                className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-50 transition-colors"
                title="Remove attachment"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AttachmentUpload;