import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token is valid and not expired
      try {
        // Simple token validation - you could add a backend verification call here
        const tokenData = JSON.parse(atob(token.split('.')[1]));
        const isExpired = tokenData.exp * 1000 < Date.now();
        
        if (!isExpired) {
          setUser({ 
            token,
            email: tokenData.email,
            displayName: tokenData.displayName 
          });
        } else {
          // Token expired, remove it
          localStorage.removeItem('token');
        }
      } catch (error) {
        console.error('Invalid token:', error);
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (token) => {
    try {
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      // Decode token to get user info
      const tokenData = JSON.parse(atob(token.split('.')[1]));
      
      setUser({ 
        token,
        email: tokenData.email,
        displayName: tokenData.displayName 
      });
    } catch (error) {
      console.error('Error logging in:', error);
      logout();
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    // Optional: Redirect to Microsoft logout
    window.location.href = 'https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=' + encodeURIComponent(window.location.origin);
  };

  const getToken = () => {
    return user?.token || localStorage.getItem('token');
  };

  const value = {
    user,
    login,
    logout,
    getToken,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}