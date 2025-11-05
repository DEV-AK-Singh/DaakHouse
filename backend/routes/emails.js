import express from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

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
          $select: 'id,subject,from,receivedDateTime,isRead,bodyPreview'
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

export default router;