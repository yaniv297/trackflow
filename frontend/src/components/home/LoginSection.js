import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './LoginSection.css';

const LoginSection = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginSuccess, setLoginSuccess] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
    // Reset login success state when user starts typing
    if (loginSuccess) {
      setLoginSuccess(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLoginSuccess(false);

    try {
      await login(credentials.username, credentials.password);
      // Mark login as successful and clear error before navigation
      setLoginSuccess(true);
      setError('');
      navigate('/');
    } catch (error) {
      setLoginSuccess(false);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-section">
      <div className="login-container">
        <div className="login-header">
          <h2>Welcome Back!</h2>
          <p>Sign in to access your music projects</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && !loading && !loginSuccess && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              required
              placeholder="Enter your username"
            />
          </div>


          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              required
              placeholder="Enter your password"
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Please wait...' : 'Sign In'}
          </button>

          <div className="forgot-password">
            <button
              type="button"
              className="forgot-password-link"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot your password?
            </button>
          </div>

          <div className="form-toggle">
            <span>
              Don't have an account?
            </span>
            <button
              type="button"
              className="toggle-button"
              onClick={() => navigate('/register')}
            >
              Sign Up
            </button>
          </div>
        </form>

      </div>
    </section>
  );
};

export default LoginSection;