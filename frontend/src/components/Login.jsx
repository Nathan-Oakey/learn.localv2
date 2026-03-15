import React, { useState } from 'react';
import './Login.css';

function Login({ onLogin, onClose }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:5001`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (!username || !password) {
      setError('Username and password are required');
      setLoading(false);
      return;
    }

    if (!isLoginMode && password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const endpoint = isLoginMode ? '/login' : '/register';
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          username: username,
          password: password
        }), credentials: "include"
      });

      const data = await response.json();

      if (response.ok) {
        if (data.success === true || data.success === "true") {
          // Login successful
          onLogin(username);
          onClose();
        } else {
          setError('Unexpected response from server');
        }
      } else {
        // Handle error responses
        if (data.error) {
          setError(data.error);
        } else {
          setError('An error occurred. Please try again.');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError('Failed to connect to server. Make sure Flask is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="login-overlay">
      <div className="login-modal">
        <button className="login-close-btn" onClick={onClose}>×</button>
        
        <div className="login-header">
          <h2>{isLoginMode ? 'Welcome Back!' : 'Create Account'}</h2>
          <p>{isLoginMode ? 'Login to access your learning resources' : 'Register to start your learning journey'}</p>
        </div>

        {error && (
          <div className="login-error">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              placeholder="Enter your username"
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="Enter your password"
              autoComplete={isLoginMode ? "current-password" : "new-password"}
            />
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                placeholder="Confirm your password"
                autoComplete="new-password"
              />
            </div>
          )}

          <button 
            type="submit" 
            className="login-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span>{isLoginMode ? 'Logging in...' : 'Creating account...'}</span>
            ) : (
              <span>{isLoginMode ? 'Login' : 'Register'}</span>
            )}
          </button>
        </form>

        <div className="login-footer">
          <button onClick={toggleMode} className="toggle-mode-btn">
            {isLoginMode 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;