import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import ContactUpload from './ContactUpload';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import TemplateManager from './components/TemplateManager';
import CampaignManager from './components/CampaignManager';
import Settings from './components/Settings';
import SystemLogs from './components/SystemLogs';
import Login from './components/Login';

// Configure Axios globally to pass cookies with requests
axios.defaults.withCredentials = true;

const BACKEND_URL = 'http://localhost:5000/api';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [status, setStatus] = useState('disconnected');
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'connection' | 'contacts' | 'templates' | 'campaigns' | 'logs' | 'settings'
  
  // Lists state
  const [lists, setLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Check if authenticated on startup
  const checkAuth = async () => {
    try {
      // Query templates endpoint to check auth
      await axios.get(`${BACKEND_URL}/campaigns`);
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  // Register Axios response interceptor to intercept 401 unauthorized errors globally
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (err) => {
        if (err.response && err.response.status === 401) {
          setIsAuthenticated(false);
        }
        return Promise.reject(err);
      }
    );
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Function to fetch the connection status from the backend API
  const fetchStatus = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/status`);
      setStatus(response.data.status);
      setQr(response.data.qr);
      setError(false);
    } catch (err) {
      console.error('Error fetching connection status:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch contact lists metadata
  const fetchLists = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/contacts/lists`);
      setLists(response.data);
    } catch (err) {
      console.error('Error fetching contact lists:', err);
    } finally {
      setLoadingLists(false);
    }
  };

  // Handle deleting contact list
  const handleDeleteList = async (listId) => {
    if (!window.confirm('Are you sure you want to delete this list and all its contacts?')) {
      return;
    }
    try {
      await axios.delete(`${BACKEND_URL}/contacts/lists/${listId}`);
      await fetchLists();
    } catch (err) {
      console.error('Error deleting list:', err);
      alert('Failed to delete contact list.');
    }
  };

  // Poll status every 3 seconds and fetch lists only if authenticated
  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchStatus();
    fetchLists();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Handle WhatsApp logout/disconnect session
  const handleLogout = async () => {
    setActionLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/logout`);
      await fetchStatus();
    } catch (err) {
      console.error('Error logging out:', err);
      alert('Failed to log out. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle dashboard login logout
  const handleDashboardLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/auth/logout`);
      setIsAuthenticated(false);
    } catch (err) {
      console.error('Error logging out of dashboard:', err);
      setIsAuthenticated(false);
    }
  };

  // Helper to get styling classes based on connection status
  const getStatusBadgeClass = () => {
    switch (status) {
      case 'connected': return 'badge status-connected';
      case 'connecting': return 'badge status-connecting';
      case 'reconnecting': return 'badge status-reconnecting';
      case 'disconnected':
      default:
        return 'badge status-disconnected';
    }
  };

  // Display status text label nicely
  const getStatusLabel = () => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return 'Reconnecting...';
      case 'disconnected':
      default:
        return 'Disconnected';
    }
  };

  if (checkingAuth) {
    return (
      <div className="loading-state" style={{ height: '100vh', justifyContent: 'center' }}>
        <div className="spinner"></div>
        <p>Authenticating session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="app-container">
      {/* Sidebar Component */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        status={status} 
        handleLogout={handleLogout} 
        actionLoading={actionLoading} 
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Top Header Bar */}
        <header className="top-header">
          <div className="header-left">
            <h2>Welcome back, Admin!</h2>
            <p className="header-subtitle">Manage your WhatsApp broadcasts and contacts</p>
          </div>
          <div className="header-right" style={{ gap: '12px' }}>
            <div className="connection-status-pill">
              <span className="status-dot-label">WhatsApp:</span>
              <span className={getStatusBadgeClass()}>{getStatusLabel()}</span>
            </div>
            <button onClick={handleDashboardLogout} className="btn-pagination" style={{ padding: '8px 16px', fontWeight: '600' }}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Content Panel */}
        <div className="content-container">
          {activeTab === 'dashboard' && (
            <Dashboard 
              lists={lists} 
              status={status} 
              qr={qr} 
              handleLogout={handleLogout} 
              actionLoading={actionLoading} 
              handleDeleteList={handleDeleteList}
              getStatusBadgeClass={getStatusBadgeClass}
              getStatusLabel={getStatusLabel}
              error={error}
              loading={loading}
            />
          )}

          {activeTab === 'connection' && (
            <div className="card">
              <header className="card-header">
                <h1>WhatsApp Connection</h1>
                <p className="subtitle">Phase 1: Connection & Authentication Module</p>
              </header>

              <main className="card-body">
                {error && (
                  <div className="alert alert-error">
                    <strong>Server Unreachable:</strong> Could not connect to backend at <code>{BACKEND_URL}</code>. Please check if the backend server is running.
                  </div>
                )}

                {loading && !error ? (
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Checking WhatsApp status...</p>
                  </div>
                ) : (
                  <div className="status-section">
                    <div className="status-indicator">
                      <span className="status-dot-label">Session Status:</span>
                      <span className={getStatusBadgeClass()}>{getStatusLabel()}</span>
                    </div>

                    {status === 'connected' ? (
                      <div className="connected-view">
                        <div className="success-icon">✅</div>
                        <h3>WhatsApp Connected</h3>
                        <p className="success-message">The bulk sender engine is ready to send messages.</p>
                        
                        <button 
                          onClick={handleLogout} 
                          className="btn btn-logout" 
                          disabled={actionLoading}
                        >
                          {actionLoading ? 'Disconnecting...' : 'Disconnect Session'}
                        </button>
                      </div>
                    ) : (
                      <div className="disconnected-view">
                        {qr ? (
                          <div className="qr-container">
                            <div className="qr-box">
                              <img src={qr} alt="WhatsApp Setup QR Code" className="qr-image" />
                            </div>
                            <div className="instructions">
                              <h4>Scan QR Code</h4>
                              <ol>
                                <li>Open WhatsApp on your mobile phone.</li>
                                <li>Tap <strong>Menu</strong> (Android) or <strong>Settings</strong> (iOS).</li>
                                <li>Select <strong>Linked Devices</strong> and tap <strong>Link a Device</strong>.</li>
                                <li>Point your phone's camera at this screen to scan the QR code.</li>
                              </ol>
                            </div>
                          </div>
                        ) : (
                          <div className="qr-placeholder">
                            <div className="spinner"></div>
                            <p>Initializing WhatsApp socket & generating QR code...</p>
                            <span className="helper-text">This may take a moment if the server is starting up.</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </main>

              <footer className="card-footer">
                <p>&copy; {new Date().getFullYear()} Pixel WhatsApp Tool. All rights reserved.</p>
              </footer>
            </div>
          )}

          {activeTab === 'contacts' && (
            <ContactUpload 
              lists={lists} 
              loadingLists={loadingLists} 
              fetchLists={fetchLists} 
              handleDeleteList={handleDeleteList} 
            />
          )}

          {activeTab === 'templates' && (
            <TemplateManager />
          )}

          {activeTab === 'campaigns' && (
            <CampaignManager />
          )}

          {activeTab === 'logs' && (
            <SystemLogs />
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
