import React, { useState, useEffect } from 'react';
import { emailService } from '../services/api';
import { formatFileSize, getFileIcon, canPreviewFile, downloadFile } from '../utils/attachmentUtils';

function AttachmentList({ emailId, hasAttachments }) {
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState(null);

  useEffect(() => {
    if (hasAttachments && emailId) {
      fetchAttachments();
    }
  }, [emailId, hasAttachments]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await emailService.getAttachments(emailId);
      setAttachments(response.data.attachments || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (attachment) => {
    try {
      setDownloading(attachment.id);
      
      const response = await emailService.downloadAttachmentContent(emailId, attachment.id);
      
      // Create blob and download
      const blob = new Blob([response.data], { 
        type: attachment.contentType || 'application/octet-stream' 
      });
      
      downloadFile(blob, attachment.name);
      
    } catch (error) {
      console.error('Error downloading attachment:', error);
      alert('Failed to download attachment');
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadAll = async () => {
    try {
      setDownloadingAll(true);
      
      const response = await emailService.downloadAllAttachments(emailId);
      
      // Create blob and download
      const blob = new Blob([response.data]);
      const filename = `attachments-${emailId}-${new Date().getTime()}.zip`;
      
      downloadFile(blob, filename);
      
    } catch (error) {
      console.error('Error downloading all attachments:', error);
      alert('Failed to download attachments');
    } finally {
      setDownloadingAll(false);
    }
  };

  const handlePreview = (attachment) => {
    if (canPreviewFile(attachment.name, attachment.contentType)) {
      setPreviewAttachment(attachment);
    } else {
      handleDownload(attachment);
    }
  };

  const closePreview = () => {
    setPreviewAttachment(null);
  };

  const renderPreview = () => {
    if (!previewAttachment) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl max-h-full w-full h-full flex flex-col">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-medium">{previewAttachment.name}</h3>
            <button
              onClick={closePreview}
              className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            {previewAttachment.contentType?.includes('image/') ? (
              <img
                src={`data:${previewAttachment.contentType};base64,${previewAttachment.contentBytes}`}
                alt={previewAttachment.name}
                className="max-w-full max-h-full mx-auto"
              />
            ) : previewAttachment.contentType === 'application/pdf' ? (
              <iframe
                src={`data:application/pdf;base64,${previewAttachment.contentBytes}`}
                className="w-full h-full min-h-[500px]"
                title={previewAttachment.name}
              />
            ) : previewAttachment.contentType?.includes('text/') ? (
              <pre className="whitespace-pre-wrap bg-gray-100 p-4 rounded text-sm">
                {previewAttachment.contentBytes ? 
                  atob(previewAttachment.contentBytes) : 'No content available'}
              </pre>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Preview not available for this file type.</p>
                <button
                  onClick={() => handleDownload(previewAttachment)}
                  className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Download File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (!hasAttachments) {
    return null;
  }

  if (loading) {
    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
          <span className="text-sm text-gray-600">Loading attachments...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={fetchAttachments}
            className="text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (attachments.length === 0 && hasAttachments) {
    return (
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-700">
          This email has attachments, but they couldn't be loaded.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            <h3 className="text-blue-800 font-medium">
              Attachments ({attachments.length})
            </h3>
          </div>

          {attachments.length > 1 && (
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 disabled:opacity-50 transition-colors"
            >
              {downloadingAll ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>
                  Downloading...
                </span>
              ) : (
                `Download All (${formatFileSize(attachments.reduce((sum, att) => sum + (att.size || 0), 0))})`
              )}
            </button>
          )}
        </div>

        <div className="space-y-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-3 bg-white rounded border hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <span className="text-xl shrink-0">
                  {getFileIcon(attachment.name, attachment.contentType)}
                </span>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.name}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>{formatFileSize(attachment.size || 0)}</span>
                    <span>{attachment.contentType || 'Unknown type'}</span>
                    {canPreviewFile(attachment.name, attachment.contentType) && (
                      <span className="text-blue-600">Preview available</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0 ml-4">
                {canPreviewFile(attachment.name, attachment.contentType) && (
                  <button
                    onClick={() => handlePreview(attachment)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium px-3 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors"
                  >
                    Preview
                  </button>
                )}
                
                <button
                  onClick={() => handleDownload(attachment)}
                  disabled={downloading === attachment.id}
                  className="text-gray-700 hover:text-gray-900 text-sm font-medium px-3 py-1 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  {downloading === attachment.id ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600 mr-1"></div>
                      Downloading...
                    </span>
                  ) : (
                    'Download'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Attachment Preview Modal */}
      {renderPreview()}
    </>
  );
}

export default AttachmentList;