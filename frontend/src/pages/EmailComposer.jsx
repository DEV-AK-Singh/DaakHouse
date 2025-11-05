import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { emailService } from '../services/api';

function EmailComposer() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    to: [''],
    cc: [],
    bcc: [],
    subject: '',
    body: ''
  });
  
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Check if we're replying or forwarding
    if (location.state) {
      const { replyTo, forward, subject, to, body } = location.state;
      
      if (replyTo || forward) {
        setFormData(prev => ({
          ...prev,
          subject: subject || prev.subject,
          to: to || prev.to,
          body: body || prev.body
        }));
      }
    }
  }, [location.state]);

  const handleRecipientChange = (field, index, value) => {
    const newRecipients = [...formData[field]];
    newRecipients[index] = value;
    setFormData({ ...formData, [field]: newRecipients });
  };

  const addRecipient = (field) => {
    setFormData({ ...formData, [field]: [...formData[field], ''] });
  };

  const removeRecipient = (field, index) => {
    const newRecipients = formData[field].filter((_, i) => i !== index);
    setFormData({ ...formData, [field]: newRecipients });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError('');

    try {
      // Filter out empty recipients
      const recipients = {
        to: formData.to.filter(email => email.trim() !== ''),
        cc: formData.cc.filter(email => email.trim() !== ''),
        bcc: formData.bcc.filter(email => email.trim() !== '')
      };

      if (recipients.to.length === 0) {
        throw new Error('At least one "To" recipient is required');
      }

      await emailService.sendEmail({
        to: recipients.to,
        cc: recipients.cc,
        bcc: recipients.bcc,
        subject: formData.subject.trim(),
        body: formData.body
      });

      navigate('/emails');
    } catch (error) {
      console.error('Error sending email:', error);
      setError(error.response?.data?.error || error.message || 'Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const RecipientField = ({ field, label }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}:
      </label>
      {formData[field].map((email, index) => (
        <div key={index} className="flex space-x-2 mb-2">
          <input
            type="email"
            value={email}
            onChange={(e) => handleRecipientChange(field, index, e.target.value)}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder={`${label.toLowerCase()}@example.com`}
          />
          {formData[field].length > 1 && (
            <button
              type="button"
              onClick={() => removeRecipient(field, index)}
              className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Remove
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => addRecipient(field)}
        className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
      >
        + Add another {label.toLowerCase()} recipient
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {location.state?.forward ? 'Forward Email' : 
           location.state?.replyTo ? 'Reply to Email' : 'Compose Email'}
        </h1>
        {location.state?.replyTo && (
          <p className="text-sm text-gray-600 mt-1">
            Replying to: {location.state.replyTo.from?.emailAddress?.name || location.state.replyTo.from?.emailAddress?.address}
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error: </strong> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <RecipientField field="to" label="To" />
        <RecipientField field="cc" label="Cc" />
        <RecipientField field="bcc" label="Bcc" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject:
          </label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Email subject"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Body:
          </label>
          <textarea
            value={formData.body}
            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
            rows="15"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            placeholder="Write your email here..."
            required
          />
        </div>

        <div className="flex space-x-4 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={sending}
            className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Email'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/emails')}
            className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              setFormData({
                to: [''],
                cc: [],
                bcc: [],
                subject: '',
                body: ''
              });
            }}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}

export default EmailComposer;