import React, { useState } from 'react';
import axios from 'axios';

const LOGIN_URL = 'http://localhost:5000/api/auth/login';

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Please fill in both username and password fields.');
      return;
    }

    setLoading(true);
    try {
      // Send login request with Axios credentials enabled to allow cookie persistence
      const response = await axios.post(
        LOGIN_URL,
        { username: username.trim(), password },
        { withCredentials: true }
      );

      if (response.data.success) {
        onLoginSuccess();
      } else {
        setError('Authorization failed. Please try again.');
      }
    } catch (err) {
      console.error('Login error:', err);
      const message = err.response?.data?.error || 'Invalid username or password.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card card">
        <header className="card-header border-none pb-0">
          <div className="login-logo">
            <span className="logo-icon">🚀</span>
            <h2>Bulk Sender Admin</h2>
          </div>
          <p className="subtitle">Sign in to manage WhatsApp campaigns and contact lists</p>
        </header>

        <main className="card-body">
          {error && <div className="alert alert-error mb-20">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group text-left">
              <label htmlFor="login-username" className="form-label">
                Username
              </label>
              <input
                type="text"
                id="login-username"
                className="file-input"
                placeholder="e.g. admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group text-left mt-16">
              <label htmlFor="login-password" className="form-label">
                Password
              </label>
              <input
                type="password"
                id="login-password"
                className="file-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary mt-24"
              disabled={loading}
              style={{ maxWidth: '100%', width: '100%' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </main>

        <footer className="card-footer">
          <p>&copy; {new Date().getFullYear()} Pixel WhatsApp Tool. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}

export default Login;
