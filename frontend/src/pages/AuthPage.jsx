import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Mail, Lock, Sparkles, MessageSquare, Eye, EyeOff } from 'lucide-react';

export const AuthPage = ({ initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'otp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, signUp, loginWithOtp, loginLegacyAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Sync mode from prop or URL
  useEffect(() => {
    if (location.pathname === '/signup') {
      setMode('signup');
    } else if (location.pathname === '/login') {
      setMode('login');
    }
  }, [location.pathname]);

  // If user is already logged in, redirect to next step (/connect-whatsapp)
  useEffect(() => {
    if (user) {
      navigate('/connect-whatsapp', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    if (mode !== 'otp' && !password.trim()) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password);
        setMessage('Account created successfully! Redirecting...');
        setTimeout(() => navigate('/connect-whatsapp'), 1000);
      } else if (mode === 'login') {
        try {
          await login(email.trim(), password);
          setMessage('Logged in successfully!');
          navigate('/connect-whatsapp');
        } catch (supaErr) {
          // Fallback check for legacy admin login (if email equals admin username)
          try {
            await loginLegacyAdmin(email.trim(), password);
            setMessage('Admin logged in!');
            navigate('/connect-whatsapp');
          } catch {
            throw supaErr;
          }
        }
      } else if (mode === 'otp') {
        await loginWithOtp(email.trim());
        setMessage('Check your email inbox for the login link / OTP code!');
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card card" style={{ maxWidth: '440px' }}>
        <header className="card-header border-none pb-0">
          <div className="auth-header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <Link to="/" style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', textDecoration: 'none' }}>
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent-teal)' }}>BulkChat Engine</span>
          </div>

          <div className="login-logo">
            <span className="logo-icon">💬</span>
            <h2>{mode === 'signup' ? 'Create BulkChat Account' : mode === 'otp' ? 'Magic Link Login' : 'Welcome Back'}</h2>
          </div>
          <p className="subtitle">
            {mode === 'signup' 
              ? 'Sign up to start your 3-step WhatsApp bulk campaign journey' 
              : mode === 'otp'
              ? 'Receive an instant login link in your email'
              : 'Sign in to access your WhatsApp Sender Account'}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="auth-tabs" style={{ display: 'flex', gap: '8px', background: 'var(--bg-primary)', padding: '4px', borderRadius: '8px', marginTop: '16px' }}>
            <button
              type="button"
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setMessage(''); }}
              style={{
                flex: 1, padding: '8px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: mode === 'login' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'login' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === 'login' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Log In
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
              onClick={() => { setMode('signup'); setError(''); setMessage(''); }}
              style={{
                flex: 1, padding: '8px', fontSize: '13px', fontWeight: '600', border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: mode === 'signup' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'signup' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === 'signup' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Sign Up
            </button>
            <button
              type="button"
              className={`auth-tab ${mode === 'otp' ? 'active' : ''}`}
              onClick={() => { setMode('otp'); setError(''); setMessage(''); }}
              style={{
                flex: 1, padding: '8px', fontSize: '12px', fontWeight: '600', border: 'none', borderRadius: '6px', cursor: 'pointer',
                background: mode === 'otp' ? 'var(--bg-card)' : 'transparent',
                color: mode === 'otp' ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: mode === 'otp' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
              }}
            >
              Email OTP
            </button>
          </div>
        </header>

        <main className="card-body mt-16">
          {error && <div className="alert alert-error mb-20">{error}</div>}
          {message && <div className="alert alert-success mb-20" style={{ background: 'var(--accent-teal-glow)', color: 'var(--accent-teal)', border: '1px solid var(--accent-teal-border)', padding: '10px', borderRadius: '8px', fontSize: '13px' }}>{message}</div>}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group text-left">
              <label htmlFor="auth-email" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> Email Address
              </label>
              <input
                type="email"
                id="auth-email"
                className="file-input"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
              />
            </div>

            {mode !== 'otp' && (
              <div className="form-group text-left mt-16">
                <label htmlFor="auth-password" className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={14} /> Password
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="auth-password"
                    className="file-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={submitting}
                    style={{ paddingRight: '42px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4px'
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary mt-24"
              disabled={submitting}
              style={{ maxWidth: '100%', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {submitting ? (
                'Processing...'
              ) : mode === 'signup' ? (
                <>Create Account <Sparkles size={16} /></>
              ) : mode === 'otp' ? (
                <>Send Magic Link / OTP <Mail size={16} /></>
              ) : (
                <>Sign In to Continue</>
              )}
            </button>
          </form>

          <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
            {mode === 'login' ? (
              <span>Don't have an account? <Link to="/signup" onClick={() => setMode('signup')} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '600' }}>Sign Up</Link></span>
            ) : (
              <span>Already have an account? <Link to="/login" onClick={() => setMode('login')} style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontWeight: '600' }}>Log In</Link></span>
            )}
          </div>
        </main>

        <footer className="card-footer">
          <p>&copy; {new Date().getFullYear()} BulkChat WhatsApp Tool. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default AuthPage;
