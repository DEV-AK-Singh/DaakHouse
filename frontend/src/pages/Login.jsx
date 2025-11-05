import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { debugAuth } from '../services/api';

function Login() {
  const [searchParams] = useSearchParams();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState(null);

  useEffect(() => {
    // Check for token in URL (from OAuth callback)
    const token = searchParams.get('token');
    const errorMessage = searchParams.get('message');
    
    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
    }
    
    if (token) {
      console.log('Received token from OAuth callback');
      login(token);
      navigate('/');
    }
  }, [searchParams, login, navigate]);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleMicrosoftLogin = () => {
    setError('');
    console.log('Initiating Microsoft login...');
    window.location.href = 'http://localhost:5000/auth/login';
  };

  const checkDebugInfo = () => {
    setDebugInfo(debugAuth.checkToken());
  };

  const clearToken = () => {
    localStorage.removeItem('token');
    window.location.reload();
  };

  if (user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl mb-4">Already logged in</h2>
          <button 
            onClick={() => navigate('/')}
            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Email Client
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in with your Microsoft account
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <strong>Error: </strong> {error}
          </div>
        )}

        <div className="space-y-4">
          <button
            onClick={handleMicrosoftLogin}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Sign in with Microsoft
          </button>

          <div className="border-t pt-4">
            <button
              onClick={checkDebugInfo}
              className="w-full text-center text-sm text-gray-600 hover:text-gray-800 py-2"
            >
              Debug Auth Info
            </button>
            
            <button
              onClick={clearToken}
              className="w-full text-center text-sm text-red-600 hover:text-red-800 py-2"
            >
              Clear Stored Token
            </button>
          </div>
        </div>

        {debugInfo && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h4 className="font-bold">Debug Info:</h4>
            <pre className="text-xs mt-2 whitespace-pre-wrap">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <h3 className="text-sm font-medium text-blue-800">Troubleshooting Steps:</h3>
          <ol className="mt-2 text-sm text-blue-700 list-decimal list-inside space-y-1">
            <li>Click "Sign in with Microsoft"</li>
            <li>Complete the Microsoft login</li>
            <li>You should be redirected back with a token</li>
            <li>Check browser console for any errors</li>
            <li>Use "Debug Auth Info" to check token status</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default Login;