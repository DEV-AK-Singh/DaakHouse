import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

// Create axios instance with better configuration
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
});

// Request interceptor to add token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    } else {
      console.warn('No token found in localStorage');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      console.error('Authentication error, redirecting to login');
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else if (error.response?.status === 403) {
      console.error('Permission denied');
    }
    return Promise.reject(error);
  }
);

export const emailService = {
  getEmails: (page = 1, pageSize = 20) => 
    api.get('/emails', { params: { page, pageSize } }),
  
  getEmail: (id) => 
    api.get(`/emails/${id}`),
  
  sendEmail: (data) => 
    api.post('/emails/send', data),
  
  updateEmail: (id, data) => 
    api.patch(`/emails/${id}`, data), 

  getAttachments: (emailId) => 
    api.get(`/emails/${emailId}/attachments`),
  
  downloadAttachment: (emailId, attachmentId) => 
    api.get(`/emails/${emailId}/attachments/${attachmentId}`, {
      responseType: 'blob' // Important for file downloads
    }),
  
  downloadAttachmentContent: (emailId, attachmentId) => 
    api.get(`/emails/${emailId}/attachments/${attachmentId}/content`, {
      responseType: 'blob'
    }),
  
  getAttachmentInfo: (emailId, attachmentId) => 
    api.get(`/emails/${emailId}/attachments/${attachmentId}`),

  sendEmailWithAttachments: (formData) => 
    api.post('/emails/send-with-attachments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // 60 seconds for large attachments
    }),
  
  downloadAllAttachments: (emailId) => 
    api.get(`/emails/${emailId}/attachments/download-all`, {
      responseType: 'blob'
    }),
  
  testPermissions: () => 
    api.get('/emails/test-permissions'),
};

// Debug function to check token
export const debugAuth = {
  checkToken: () => {
    const token = localStorage.getItem('token');
    if (!token) {
      return { hasToken: false, message: 'No token in localStorage' };
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return {
        hasToken: true,
        token: token.substring(0, 20) + '...',
        payload,
        isExpired: payload.exp * 1000 < Date.now()
      };
    } catch (error) {
      return { hasToken: true, error: 'Invalid token format' };
    }
  }
};

export default api;