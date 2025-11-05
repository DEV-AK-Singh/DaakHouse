import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import EmailList from './pages/EmailList';
import EmailComposer from './pages/EmailComposer';
import EmailView from './pages/EmailView';
import Layout from './components/Layout';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/success" element={<Login />} />
          <Route path="/auth/error" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/emails" element={
            <ProtectedRoute>
              <Layout>
                <EmailList />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/compose" element={
            <ProtectedRoute>
              <Layout>
                <EmailComposer />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/emails/:id" element={
            <ProtectedRoute>
              <Layout>
                <EmailView />
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;