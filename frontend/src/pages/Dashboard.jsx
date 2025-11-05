import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { emailService, debugAuth } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

function Dashboard() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    fetchRecentEmails();
  }, []);

  const fetchRecentEmails = async () => {
    try {
      setLoading(true);
      const response = await emailService.getEmails(1, 10);
      setEmails(response.data.emails || []);
    } catch (error) {
      console.error('Error fetching emails:', error);
      setError(error.response?.data?.error || 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      setLoading(true);
      const response = await emailService.testPermissions();
      console.log('Connection test:', response.data);
      alert('Connection successful! Check console for details.');
    } catch (error) {
      console.error('Connection test failed:', error);
      alert('Connection failed: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="space-x-4">
          <button
            onClick={testConnection}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
          >
            Test Connection
          </button>
          <Link
            to="/compose"
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700"
          >
            Compose Email
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <strong>Error: </strong> {error}
          <div className="mt-2 text-sm">
            <button 
              onClick={() => window.location.reload()}
              className="text-red-600 underline"
            >
              Try again
            </button>
            {' or '}
            <button 
              onClick={() => localStorage.removeItem('token') && window.location.reload()}
              className="text-red-600 underline"
            >
              Clear token and login again
            </button>
          </div>
        </div>
      )}

      {/* Debug Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
        <h3 className="font-bold text-yellow-800">Authentication Status</h3>
        <pre className="text-xs mt-2 whitespace-pre-wrap">
          {JSON.stringify(debugAuth.checkToken(), null, 2)}
        </pre>
      </div>

      {/* Recent Emails */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Recent Emails</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {emails.length === 0 ? (
            <div className="px-6 py-4 text-center text-gray-500">
              No emails found or unable to access mailbox
            </div>
          ) : (
            emails.map((email) => (
              <div key={email.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {email.from?.emailAddress?.name || 'Unknown Sender'}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {email.subject || 'No Subject'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(email.receivedDateTime).toLocaleString()}
                    </p>
                  </div>
                  <Link
                    to={`/emails/${email.id}`}
                    className="ml-4 text-sm text-blue-600 hover:text-blue-800"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;