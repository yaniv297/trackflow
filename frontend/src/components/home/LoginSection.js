import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './LoginSection.css';

const LoginSection = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await login(credentials.username, credentials.password);
        navigate('/');
      } else {
        await register(credentials.username, email, credentials.password);
        navigate('/');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-section">
      <div className="login-container">
        <div className="login-header">
          <h2>{isLogin ? 'Welcome Back!' : 'Join TrackFlow'}</h2>
          <p>{isLogin ? 'Sign in to access your music projects' : 'Start managing your music projects today'}</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
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

          {!isLogin && (
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
              />
            </div>
          )}

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
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>

          {isLogin && (
            <div className="forgot-password">
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => navigate('/forgot-password')}
              >
                Forgot your password?
              </button>
            </div>
          )}

          <div className="form-toggle">
            <span>
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button
              type="button"
              className="toggle-button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setCredentials({ username: '', password: '' });
                setEmail('');
              }}
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </div>
        </form>

      </div>
    </section>
  );
};

export default LoginSection;