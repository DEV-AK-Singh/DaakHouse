import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { emailService } from '../services/api';

function EmailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    if (id) {
      fetchEmail();
    }
  }, [id]);

  const fetchEmail = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await emailService.getEmail(id);
      setEmail(response.data);
      
      // Mark as read if not already read
      if (!response.data.isRead) {
        markAsRead();
      }
    } catch (error) {
      console.error('Error fetching email:', error);
      setError(error.response?.data?.error || 'Failed to load email');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async () => {
    try {
      setMarkingRead(true);
      await emailService.updateEmail(id, { isRead: true });
      setEmail(prev => prev ? { ...prev, isRead: true } : null);
    } catch (error) {
      console.error('Error marking email as read:', error);
    } finally {
      setMarkingRead(false);
    }
  };

  const markAsUnread = async () => {
    try {
      setMarkingRead(true);
      await emailService.updateEmail(id, { isRead: false });
      setEmail(prev => prev ? { ...prev, isRead: false } : null);
    } catch (error) {
      console.error('Error marking email as unread:', error);
    } finally {
      setMarkingRead(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRecipients = (recipients) => {
    if (!recipients || !Array.isArray(recipients)) return 'No recipients';
    return recipients.map(recipient => 
      recipient.emailAddress?.name || recipient.emailAddress?.address || 'Unknown'
    ).join(', ');
  };

  const getEmailBody = () => {
    if (!email) return '';
    
    if (email.body?.contentType === 'html') {
      return { __html: email.body.content };
    }
    
    return { __html: email.body?.content || email.bodyPreview || 'No content' };
  };

  const handleReply = () => {
    navigate('/compose', {
      state: {
        replyTo: email,
        subject: `Re: ${email.subject}`,
        to: [email.from?.emailAddress?.address].filter(Boolean)
      }
    });
  };

  const handleReplyAll = () => {
    const allRecipients = [
      email.from?.emailAddress?.address,
      ...(email.toRecipients || []).map(r => r.emailAddress?.address),
      ...(email.ccRecipients || []).map(r => r.emailAddress?.address)
    ].filter((email, index, self) => 
      email && self.indexOf(email) === index
    );

    navigate('/compose', {
      state: {
        replyTo: email,
        subject: `Re: ${email.subject}`,
        to: allRecipients
      }
    });
  };

  const handleForward = () => {
    navigate('/compose', {
      state: {
        forward: email,
        subject: `Fwd: ${email.subject}`,
        body: `\n\n---------- Forwarded message ---------\nFrom: ${email.from?.emailAddress?.name || email.from?.emailAddress?.address}\nDate: ${formatDate(email.receivedDateTime)}\nSubject: ${email.subject}\nTo: ${formatRecipients(email.toRecipients)}\n\n${email.body?.content || ''}`
      }
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <div className="flex items-center">
            <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h3 className="font-medium">Failed to load email</h3>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
          <div className="mt-4 flex space-x-4">
            <button
              onClick={fetchEmail}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700"
            >
              Try Again
            </button>
            <button
              onClick={() => navigate('/emails')}
              className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700"
            >
              Back to Inbox
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!email) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Not Found</h2>
        <p className="text-gray-600 mb-6">The requested email could not be found or you don't have permission to view it.</p>
        <Link
          to="/emails"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Inbox
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border">
      {/* Email Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {email.subject || 'No Subject'}
            </h1>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="font-medium text-gray-900 mr-2">From:</span>
                <span>
                  {email.from?.emailAddress?.name || email.from?.emailAddress?.address || 'Unknown Sender'}
                  {email.from?.emailAddress?.address && (
                    <span className="text-gray-500 ml-1">
                      ({email.from.emailAddress.address})
                    </span>
                  )}
                </span>
              </div>
              
              {email.importance === 'high' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9a7 7 0 1110 0A7 7 0 015 9zm5 5a5 5 0 100-10 5 5 0 000 10z" clipRule="evenodd" />
                  </svg>
                  Important
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={email.isRead ? markAsUnread : markAsRead}
              disabled={markingRead}
              className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 ${
                email.isRead ? 'bg-gray-100' : 'bg-blue-50 border-blue-200'
              }`}
            >
              <svg className={`w-4 h-4 mr-2 ${email.isRead ? 'text-gray-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {email.isRead ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                )}
              </svg>
              {email.isRead ? 'Mark Unread' : 'Mark Read'}
            </button>
          </div>
        </div>

        {/* Recipient Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium text-gray-900">To:</span>
            <span className="ml-2">{formatRecipients(email.toRecipients)}</span>
          </div>
          
          {email.ccRecipients && email.ccRecipients.length > 0 && (
            <div>
              <span className="font-medium text-gray-900">Cc:</span>
              <span className="ml-2">{formatRecipients(email.ccRecipients)}</span>
            </div>
          )}
          
          {email.bccRecipients && email.bccRecipients.length > 0 && (
            <div>
              <span className="font-medium text-gray-900">Bcc:</span>
              <span className="ml-2">{formatRecipients(email.bccRecipients)}</span>
            </div>
          )}
          
          <div className="md:col-span-2">
            <span className="font-medium text-gray-900">Date:</span>
            <span className="ml-2">{formatDate(email.receivedDateTime || email.sentDateTime)}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-b border-gray-200 px-6 py-3 bg-gray-50">
        <div className="flex space-x-3">
          <button
            onClick={handleReply}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply
          </button>
          
          <button
            onClick={handleReplyAll}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Reply All
          </button>
          
          <button
            onClick={handleForward}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            Forward
          </button>
        </div>
      </div>

      {/* Email Body */}
      <div className="px-6 py-8">
        {email.hasAttachments && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="text-blue-800 font-medium">This email contains attachments</span>
            </div>
            <p className="text-blue-700 text-sm mt-1">
              Note: Attachment download functionality can be added to view and download files.
            </p>
          </div>
        )}

        <div 
          className="prose prose-lg max-w-none email-body-content"
          dangerouslySetInnerHTML={getEmailBody()}
        />
        
        {/* Fallback for plain text content */}
        {(!email.body?.content && email.bodyPreview) && (
          <div className="whitespace-pre-wrap text-gray-900 leading-relaxed">
            {email.bodyPreview}
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
        <div className="flex justify-between items-center">
          <button
            onClick={() => navigate('/emails')}
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Inbox
          </button>
          
          <div className="text-sm text-gray-500">
            Message ID: {email.id?.substring(0, 8)}...
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailView;