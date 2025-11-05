import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { emailService } from '../services/api';
import AttachmentList from '../components/AttachmentList';

const sanitizeEmailContent = (html) => {
  if (!html) return '';
  
  // Create a temporary div to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  // Remove problematic elements and attributes
  const removeElements = [
    'script', 'style', 'link', 'meta', 'base', 'iframe', 'object', 'embed',
    'form', 'input', 'button', 'select', 'textarea'
  ];
  
  removeElements.forEach(tag => {
    const elements = tempDiv.getElementsByTagName(tag);
    while (elements.length > 0) {
      elements[0].parentNode.removeChild(elements[0]);
    }
  });

  // Safe tags and attributes
  const safeTags = [
    'p', 'div', 'span', 'br', 'hr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'blockquote', 'code', 'pre',
    'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'a', 'img', 'font'
  ];

  const safeAttributes = [
    'href', 'src', 'alt', 'title', 'width', 'height', 'border',
    'cellpadding', 'cellspacing', 'colspan', 'rowspan',
    'style', 'class', 'align', 'valign', 'color', 'size', 'face'
  ];

  // Clean all elements
  const allElements = tempDiv.getElementsByTagName('*');
  for (let element of allElements) {
    // Remove unsafe tags
    if (!safeTags.includes(element.tagName.toLowerCase())) {
      element.parentNode.removeChild(element);
      continue;
    }

    // Remove unsafe attributes
    const attributes = element.attributes;
    for (let i = attributes.length - 1; i >= 0; i--) {
      const attr = attributes[i];
      if (!safeAttributes.includes(attr.name.toLowerCase())) {
        element.removeAttribute(attr.name);
      }
    }

    // Sanitize specific attributes
    if (element.hasAttribute('href')) {
      const href = element.getAttribute('href');
      if (href && !href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:')) {
        element.setAttribute('href', '#');
        element.style.pointerEvents = 'none';
        element.style.color = 'inherit';
        element.style.textDecoration = 'none';
      }
    }

    if (element.hasAttribute('style')) {
      const style = element.getAttribute('style');
      // Remove dangerous CSS properties
      const safeStyle = style.replace(/(javascript|expression|behavior|binding)/gi, '');
      element.setAttribute('style', safeStyle);
    }
  }

  // Fix common email client quirks
  let cleanedHtml = tempDiv.innerHTML;

  // Remove excessive margins and padding from Outlook
  cleanedHtml = cleanedHtml.replace(/margin:\s*0cm\s*0cm\s*0cm\s*0cm;?/gi, '');
  cleanedHtml = cleanedHtml.replace(/padding:\s*0cm\s*0cm\s*0cm\s*0cm;?/gi, '');
  
  // Remove MS Office specific classes
  cleanedHtml = cleanedHtml.replace(/class="MsoNormal"/gi, '');
  cleanedHtml = cleanedHtml.replace(/class="[^"]*mso[^"]*"/gi, '');

  return cleanedHtml;
};

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
      console.log('Email data received:', response.data);
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
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatRecipients = (recipients) => {
    if (!recipients || !Array.isArray(recipients)) return 'No recipients';
    
    return recipients
      .map(recipient => {
        const emailAddress = recipient.emailAddress || recipient;
        if (typeof emailAddress === 'string') {
          return emailAddress;
        }
        return emailAddress.name || emailAddress.address || 'Unknown';
      })
      .filter(Boolean)
      .join(', ');
  }; 

  const getSenderInfo = () => {
    if (!email.from) return { name: 'Unknown Sender', email: '' };
    
    const from = email.from.emailAddress || email.from;
    return {
      name: from.name || from.address || 'Unknown Sender',
      email: from.address || ''
    };
  };

  const handleReply = () => {
    const sender = getSenderInfo();
    navigate('/compose', {
      state: {
        replyTo: email,
        subject: `Re: ${email.subject || 'No Subject'}`,
        to: [sender.email].filter(Boolean),
        body: `\n\n--- Original Message ---\nFrom: ${sender.name}${sender.email ? ` <${sender.email}>` : ''}\nDate: ${formatDate(email.receivedDateTime)}\nSubject: ${email.subject || 'No Subject'}\n\n`
      }
    });
  };

  const handleReplyAll = () => {
    const sender = getSenderInfo();
    const allRecipients = [
      sender.email,
      ...(email.toRecipients || []).map(r => {
        const addr = r.emailAddress || r;
        return typeof addr === 'string' ? addr : addr.address;
      }),
      ...(email.ccRecipients || []).map(r => {
        const addr = r.emailAddress || r;
        return typeof addr === 'string' ? addr : addr.address;
      })
    ].filter((email, index, self) => 
      email && self.indexOf(email) === index
    );

    navigate('/compose', {
      state: {
        replyTo: email,
        subject: `Re: ${email.subject || 'No Subject'}`,
        to: allRecipients,
        body: `\n\n--- Original Message ---\nFrom: ${sender.name}${sender.email ? ` <${sender.email}>` : ''}\nDate: ${formatDate(email.receivedDateTime)}\nSubject: ${email.subject || 'No Subject'}\nTo: ${formatRecipients(email.toRecipients)}\n${email.ccRecipients?.length ? `Cc: ${formatRecipients(email.ccRecipients)}\n` : ''}\n`
      }
    });
  };

  const handleForward = () => {
    const sender = getSenderInfo();
    navigate('/compose', {
      state: {
        forward: email,
        subject: `Fwd: ${email.subject || 'No Subject'}`,
        body: `\n\n---------- Forwarded message ---------\nFrom: ${sender.name}${sender.email ? ` <${sender.email}>` : ''}\nDate: ${formatDate(email.receivedDateTime)}\nSubject: ${email.subject || 'No Subject'}\nTo: ${formatRecipients(email.toRecipients)}\n${email.ccRecipients?.length ? `Cc: ${formatRecipients(email.ccRecipients)}\n` : ''}\n\n`
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <svg className="w-8 h-8 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h3 className="text-lg font-medium text-red-800">Failed to load email</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <div className="flex space-x-4">
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
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Email Not Found</h2>
          <p className="text-gray-600 mb-6">The requested email could not be found.</p>
          <Link
            to="/emails"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Back to Inbox
          </Link>
        </div>
      </div>
    );
  }

  const sender = getSenderInfo();

  return (
    <div className="min-h-screen py-6">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with navigation */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/emails')}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Inbox
              </button>
              <div className="w-px h-6 bg-gray-300"></div>
              <button
                onClick={email.isRead ? markAsUnread : markAsRead}
                disabled={markingRead}
                className={`flex items-center text-sm px-3 py-1 rounded border transition-colors ${
                  email.isRead 
                    ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' 
                    : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'
                } disabled:opacity-50`}
              >
                {markingRead ? (
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current mr-2"></div>
                ) : (
                  <svg className={`w-4 h-4 mr-2 ${email.isRead ? 'text-gray-600' : 'text-blue-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {email.isRead ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    )}
                  </svg>
                )}
                {email.isRead ? 'Mark Unread' : 'Mark Read'}
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleReply}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
                Reply
              </button>
              <button
                onClick={handleReplyAll}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                Reply All
              </button>
              <button
                onClick={handleForward}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors text-sm"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                Forward
              </button>
            </div>
          </div>
        </div>

        {/* Email Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Email Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {email.subject || 'No Subject'}
                </h1>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900 mr-2">From:</span>
                    <span className="flex items-center">
                      {sender.name}
                      {sender.email && (
                        <span className="text-gray-500 ml-1">
                          ({sender.email})
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
              
              <div className="text-sm text-gray-500 text-right">
                {formatDate(email.receivedDateTime || email.sentDateTime)}
              </div>
            </div>

            {/* Recipient Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
              {email.toRecipients && email.toRecipients.length > 0 && (
                <div>
                  <span className="font-medium text-gray-900">To:</span>
                  <span className="ml-2">{formatRecipients(email.toRecipients)}</span>
                </div>
              )}
              
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
            </div>
          </div>

          <div className="px-6 py-8">
  {/* Attachments - Show before email body */}
  <AttachmentList 
    emailId={id} 
    hasAttachments={email.hasAttachments} 
  />

  {/* Email Body Content */}
  <div className="mt-6">
    {email.body?.contentType === 'html' && email.body.content ? (
      <div 
        className="email-html-content"
        dangerouslySetInnerHTML={{ 
          __html: sanitizeEmailContent(email.body.content) 
        }}
      />
    ) : email.body?.contentType === 'text' && email.body.content ? (
      <div className="email-text-content">
        <pre className="whitespace-pre-wrap font-sans text-gray-900 leading-relaxed">
          {email.body.content}
        </pre>
      </div>
    ) : email.bodyPreview ? (
      <div className="email-preview-content">
        <pre className="whitespace-pre-wrap font-sans text-gray-900 leading-relaxed">
          {email.bodyPreview}
        </pre>
      </div>
    ) : (
      <div className="text-gray-500 italic">
        No content available
      </div>
    )}
  </div>
</div>
          {/* Footer Actions */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <div className="flex space-x-4">
                <button
                  onClick={handleReply}
                  className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition-colors"
                >
                  Reply
                </button>
                <button
                  onClick={handleReplyAll}
                  className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  Reply All
                </button>
                <button
                  onClick={handleForward}
                  className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700 transition-colors"
                >
                  Forward
                </button>
              </div>
              
              <div className="text-xs text-gray-500">
                Message ID: {email.id?.substring(0, 8)}...
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
}

export default EmailView;