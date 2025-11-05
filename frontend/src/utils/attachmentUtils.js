// File size formatter
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// File icon based on file type
export const getFileIcon = (fileName, contentType) => {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  
  if (!contentType) contentType = '';
  
  // Document types
  if (contentType.includes('pdf') || extension === 'pdf') {
    return '📄';
  } else if (contentType.includes('word') || extension === 'doc' || extension === 'docx') {
    return '📝';
  } else if (contentType.includes('excel') || extension === 'xls' || extension === 'xlsx') {
    return '📊';
  } else if (contentType.includes('powerpoint') || extension === 'ppt' || extension === 'pptx') {
    return '📽️';
  } else if (contentType.includes('text') || extension === 'txt') {
    return '📃';
  }
  // Image types
  else if (contentType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension)) {
    return '🖼️';
  }
  // Archive types
  else if (contentType.includes('zip') || extension === 'zip' || extension === 'rar' || extension === '7z') {
    return '📦';
  }
  // Audio types
  else if (contentType.includes('audio') || extension === 'mp3' || extension === 'wav' || extension === 'ogg') {
    return '🎵';
  }
  // Video types
  else if (contentType.includes('video') || extension === 'mp4' || extension === 'avi' || extension === 'mov') {
    return '🎬';
  }
  // Code files
  else if (['js', 'html', 'css', 'json', 'xml', 'py', 'java', 'cpp', 'c'].includes(extension)) {
    return '📄';
  }
  // Default
  else {
    return '📎';
  }
};

// Check if file type can be previewed
export const canPreviewFile = (fileName, contentType) => {
  const extension = fileName?.split('.').pop()?.toLowerCase();
  const previewableTypes = [
    'pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'txt'
  ];
  const previewableContentTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'text/plain'
  ];
  
  return previewableTypes.includes(extension) || 
         previewableContentTypes.some(type => contentType?.includes(type));
};

// Download file utility
export const downloadFile = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};