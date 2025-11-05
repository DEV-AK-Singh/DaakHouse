import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Accept all file types but you can filter here
    cb(null, true);
  }
});

const handleGraphAPIError = (error, operation) => {
  console.error(`Error in ${operation}:`, error.response?.data || error.message);
  return {
    error: `Failed to ${operation}`,
    details: error.response?.data?.error?.message || error.message
  };
};

// Middleware to verify JWT and attach user
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Test Permissions
router.get('/test-permissions', authenticate, async (req, res) => {
  try {
    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me/mailFolders',
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`
        }
      }
    );
    res.json(response.data);
  } catch (error) {
    console.error('Error testing permissions:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to test permissions' });
  }
});

// Get emails
router.get('/', authenticate, async (req, res) => {
  const page = req.query.page || 1;
  const pageSize = req.query.pageSize || 20;
  try {
    const response = await axios.get(
      'https://graph.microsoft.com/v1.0/me/messages',
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`
        },
        params: { 
          $top: pageSize,
          $skip: (page - 1) * pageSize,
          $orderby: 'receivedDateTime DESC',
          $select: 'id,subject,from,receivedDateTime,isRead,bodyPreview,hasAttachments'
        }
      }
    ); 
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching emails:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

// Get single email
router.get('/:id', authenticate, async (req, res) => {
  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/messages/${req.params.id}`,
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error fetching email:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch email' });
  }
});

// Send email
router.post('/send', authenticate, async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    const emailData = {
      message: {
        subject,
        body: {
          contentType: 'HTML',
          content: body
        },
        toRecipients: to.map(email => ({
          emailAddress: {
            address: email
          }
        }))
      }
    };

    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      emailData,
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({ success: true, message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// Update email (mark as read/unread)
router.patch('/:id', authenticate, async (req, res) => {
  try {
    const response = await axios.patch(
      `https://graph.microsoft.com/v1.0/me/messages/${req.params.id}`,
      req.body,
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error updating email:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to update email' });
  }
});

// Get email attachments
router.get('/:id/attachments', authenticate, async (req, res) => {
  try {
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/messages/${req.params.id}/attachments`,
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json({
      attachments: response.data.value || [],
      total: response.data.value?.length || 0
    });
  } catch (error) {
    const errorInfo = handleGraphAPIError(error, 'get-attachments');
    res.status(500).json(errorInfo);
  }
});

// Download specific attachment
router.get('/:emailId/attachments/:attachmentId', authenticate, async (req, res) => {
  try {
    const { emailId, attachmentId } = req.params;

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const attachment = response.data;

    // Set appropriate headers for download
    if (attachment.contentBytes) {
      // For file attachments
      const buffer = Buffer.from(attachment.contentBytes, 'base64');
      
      res.setHeader('Content-Type', attachment.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } else if (attachment.contentType === 'message/rfc822') {
      // For embedded messages
      res.setHeader('Content-Type', 'message/rfc822');
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}.eml"`);
      res.send(attachment.contentBytes ? Buffer.from(attachment.contentBytes, 'base64') : '');
    } else {
      // For other types (itemAttachment)
      res.json(attachment);
    }

  } catch (error) {
    const errorInfo = handleGraphAPIError(error, 'download-attachment');
    res.status(500).json(errorInfo);
  }
});

// Get attachment metadata only
router.get('/:emailId/attachments/:attachmentId/content', authenticate, async (req, res) => {
  try {
    const { emailId, attachmentId } = req.params;

    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/attachments/${attachmentId}/$value`,
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );

    // Get attachment details to determine filename and type
    const attachmentInfo = await axios.get(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/attachments/${attachmentId}`,
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`
        }
      }
    );

    const attachment = attachmentInfo.data;
    const buffer = Buffer.from(response.data);

    res.setHeader('Content-Type', attachment.contentType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
    res.setHeader('Content-Length', buffer.length);
    
    res.send(buffer);

  } catch (error) {
    const errorInfo = handleGraphAPIError(error, 'download-attachment-content');
    res.status(500).json(errorInfo);
  }
});

// Send email with attachments
router.post('/send-with-attachments', authenticate, upload.array('attachments', 10), async (req, res) => {
  try {
    const { to, subject, body, cc = [], bcc = [] } = req.body;
    const attachments = req.files || [];

    console.log('Sending email with attachments:', { 
      to: typeof to === 'string' ? JSON.parse(to) : to,
      subject,
      bodyLength: body?.length,
      attachmentCount: attachments.length 
    });

    // Validate required fields
    if (!to) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }
    
    const toArray = typeof to === 'string' ? JSON.parse(to) : to;
    if (!Array.isArray(toArray) || toArray.length === 0) {
      return res.status(400).json({ error: 'At least one recipient is required' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'Subject and body are required' });
    }

    // Prepare email data
    const emailData = {
      message: {
        subject: subject.trim(),
        body: {
          contentType: 'HTML',
          content: body
        },
        toRecipients: toArray.map(email => ({
          emailAddress: {
            address: email.trim()
          }
        }))
      },
      saveToSentItems: true
    };

    // Add CC if provided
    const ccArray = typeof cc === 'string' ? JSON.parse(cc) : cc;
    if (ccArray && ccArray.length > 0) {
      emailData.message.ccRecipients = ccArray.map(email => ({
        emailAddress: {
          address: email.trim()
        }
      }));
    }

    // Add BCC if provided
    const bccArray = typeof bcc === 'string' ? JSON.parse(bcc) : bcc;
    if (bccArray && bccArray.length > 0) {
      emailData.message.bccRecipients = bccArray.map(email => ({
        emailAddress: {
          address: email.trim()
        }
      }));
    }

    // Add attachments if any
    if (attachments.length > 0) {
      emailData.message.attachments = attachments.map(file => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: file.originalname,
        contentType: file.mimetype,
        contentBytes: file.buffer.toString('base64')
      }));
    }

    console.log('Sending email to Microsoft Graph...');

    const response = await axios.post(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      emailData,
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Email sent successfully');

    res.json({ 
      success: true, 
      messageId: response.data.id,
      message: `Email sent successfully${attachments.length > 0 ? ` with ${attachments.length} attachment(s)` : ''}`,
      attachmentCount: attachments.length
    });

  } catch (error) {
    console.error('Error sending email with attachments:', error.response?.data || error.message);
    
    const errorInfo = handleGraphAPIError(error, 'send-email-with-attachments');
    res.status(500).json({
      ...errorInfo,
      details: 'Failed to send email with attachments'
    });
  }
});

// Bulk download attachments as ZIP
router.get('/:emailId/attachments/download-all', authenticate, async (req, res) => {
  try {
    const { emailId } = req.params;

    // Get all attachments
    const attachmentsResponse = await axios.get(
      `https://graph.microsoft.com/v1.0/me/messages/${emailId}/attachments`,
      {
        headers: {
          Authorization: `Bearer ${req.user.accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const attachments = attachmentsResponse.data.value || [];

    if (attachments.length === 0) {
      return res.status(404).json({ error: 'No attachments found' });
    }

    // For single attachment, download directly
    if (attachments.length === 1) {
      const attachment = attachments[0];
      const response = await axios.get(
        `https://graph.microsoft.com/v1.0/me/messages/${emailId}/attachments/${attachment.id}/$value`,
        {
          headers: {
            Authorization: `Bearer ${req.user.accessToken}`
          },
          responseType: 'arraybuffer'
        }
      );

      const buffer = Buffer.from(response.data);
      res.setHeader('Content-Type', attachment.contentType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
      res.setHeader('Content-Length', buffer.length);
      return res.send(buffer);
    }

    // For multiple attachments, we'll create a simple concatenated download
    // Note: For proper ZIP creation, you'd need to implement a ZIP service
    let downloadContent = '';
    let totalSize = 0;

    for (const attachment of attachments) {
      try {
        const response = await axios.get(
          `https://graph.microsoft.com/v1.0/me/messages/${emailId}/attachments/${attachment.id}`,
          {
            headers: {
              Authorization: `Bearer ${req.user.accessToken}`
            }
          }
        );

        const attachmentData = response.data;
        downloadContent += `\n\n--- Attachment: ${attachmentData.name} (${attachmentData.contentType}) ---\n`;
        
        if (attachmentData.contentBytes) {
          const content = Buffer.from(attachmentData.contentBytes, 'base64').toString('utf8');
          downloadContent += content.substring(0, 1000) + (content.length > 1000 ? '... [truncated]' : '');
        }
        
        totalSize += attachmentData.size || 0;
      } catch (attachmentError) {
        console.error(`Failed to process attachment ${attachment.id}:`, attachmentError.message);
        downloadContent += `\n\n--- Attachment: ${attachment.name} (Failed to load) ---\n`;
      }
    }

    const buffer = Buffer.from(downloadContent, 'utf8');
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="attachments-summary-${emailId}.txt"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);

  } catch (error) {
    console.error('Error in bulk download:', error);
    const errorInfo = handleGraphAPIError(error, 'bulk-download-attachments');
    res.status(500).json(errorInfo);
  }
});

export default router;