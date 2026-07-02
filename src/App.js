import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import Kiosk from './Kiosk';

function App() {
  // 🚀 Read from sessionStorage so a page refresh doesn't log you out
  const [authMode, setAuthMode] = useState(sessionStorage.getItem('authMode'));

  const handleLogin = (mode) => {
    sessionStorage.setItem('authMode', mode);
    setAuthMode(mode);
  };

  // 🛡️ THE GATEKEEPER: This component blocks unauthorized access
  const ProtectedRoute = ({ children, allowedMode }) => {
    if (authMode !== allowedMode) {
      // If they try to bypass the login by typing the URL, kick them to the login screen
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Router>
      <Routes>
        {/* Pass the handleLogin function to the Login screen */}
        <Route path="/" element={<Login onLogin={handleLogin} />} />
        
        {/* Protected Admin Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute allowedMode="admin">
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected Kiosk Route */}
        <Route 
          path="/kiosk" 
          element={
            <ProtectedRoute allowedMode="kiosk">
              <Kiosk />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;