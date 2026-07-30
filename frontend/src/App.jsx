import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { Menu } from 'lucide-react';
import './App.css';
import ContactUpload from './ContactUpload';
import { ToastContainer } from './components/Toast';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import TemplateManager from './components/TemplateManager';
import CampaignManager from './components/CampaignManager';
import Settings from './components/Settings';
import SystemLogs from './components/SystemLogs';
import ChatInbox from './components/ChatInbox';
import AnalyticsDashboard from './components/AnalyticsDashboard';

import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import ConnectWhatsAppPage from './pages/ConnectWhatsAppPage';
import SubscriptionPage from './pages/SubscriptionPage';

axios.defaults.withCredentials = true;

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function DashboardLayout() {
  const { logout, whatsappStatus, qr, fetchWhatsAppStatus } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [actionLoading, setActionLoading] = useState(false);

  // Toasts state
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };
  
  // Lists state
  const [lists, setLists] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);

  // Fetch contact lists metadata
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

  useEffect(() => {
    fetchLists();
  }, []);

  const handleWhatsAppLogout = async () => {
    setActionLoading(true);
    try {
      await axios.post(`${BACKEND_URL}/logout`);
      await fetchWhatsAppStatus();
    } catch (err) {
      console.error('Error logging out WhatsApp session:', err);
      alert('Failed to log out WhatsApp session. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeClass = () => {
    switch (whatsappStatus) {
      case 'connected': return 'badge status-connected';
      case 'connecting': return 'badge status-connecting';
      case 'reconnecting': return 'badge status-reconnecting';
      default: return 'badge status-disconnected';
    }
  };

  const getStatusLabel = () => {
    switch (whatsappStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'reconnecting': return 'Reconnecting...';
      default: return 'Disconnected';
    }
  };

  return (
    <div className={`app-container ${theme === 'dark' ? 'dark-theme' : ''}`}>
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)}></div>
      )}

      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        status={whatsappStatus} 
        handleLogout={handleWhatsAppLogout} 
        actionLoading={actionLoading} 
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <main className="main-content">
        <header className="top-header">
          <div className="header-left">
            <button 
              className="hamburger-btn" 
              onClick={() => setSidebarOpen(true)}
              aria-label="Open Sidebar"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2>Welcome back, Admin!</h2>
              <p className="header-subtitle">Manage your WhatsApp broadcasts and contacts</p>
            </div>
          </div>
          <div className="header-right" style={{ gap: '12px' }}>
            <div className="connection-status-pill">
              <span className="status-dot-label">WhatsApp:</span>
              <span className={getStatusBadgeClass()}>{getStatusLabel()}</span>
            </div>
            <button onClick={logout} className="btn-pagination" style={{ padding: '8px 16px', fontWeight: '600' }}>
              Sign Out
            </button>
          </div>
        </header>

        <div className="content-container">
          {activeTab === 'dashboard' && (
            <Dashboard 
              lists={lists} 
              status={whatsappStatus} 
              qr={qr} 
              handleLogout={handleWhatsAppLogout} 
              actionLoading={actionLoading} 
              handleDeleteList={handleDeleteList}
              getStatusBadgeClass={getStatusBadgeClass}
              getStatusLabel={getStatusLabel}
              error={false}
              loading={false}
              showToast={showToast}
            />
          )}

          {activeTab === 'analytics' && <AnalyticsDashboard />}

          {activeTab === 'connection' && (
            <div className="card">
              <header className="card-header">
                <h1>WhatsApp Connection</h1>
                <p className="subtitle">Phase 1: Connection & Authentication Module</p>
              </header>

              <main className="card-body">
                <div className="status-section">
                  <div className="status-indicator">
                    <span className="status-dot-label">Session Status:</span>
                    <span className={getStatusBadgeClass()}>{getStatusLabel()}</span>
                  </div>

                  {whatsappStatus === 'connected' ? (
                    <div className="connected-view">
                      <div className="success-icon">✅</div>
                      <h3>WhatsApp Connected</h3>
                      <p className="success-message">The bulk sender engine is ready to send messages.</p>
                      
                      <button 
                        onClick={handleWhatsAppLogout} 
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
              </main>

              <footer className="card-footer">
                <p>&copy; {new Date().getFullYear()} BulkChat WhatsApp Tool. All rights reserved.</p>
              </footer>
            </div>
          )}

          {activeTab === 'contacts' && (
            <ContactUpload 
              lists={lists} 
              loadingLists={loadingLists} 
              fetchLists={fetchLists} 
              handleDeleteList={handleDeleteList} 
              showToast={showToast}
            />
          )}

          {activeTab === 'templates' && <TemplateManager showToast={showToast} />}
          {activeTab === 'inbox' && <ChatInbox />}
          {activeTab === 'campaigns' && <CampaignManager showToast={showToast} />}
          {activeTab === 'logs' && <SystemLogs />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
      
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage initialMode="login" />} />
          <Route path="/signup" element={<AuthPage initialMode="signup" />} />
          <Route 
            path="/connect-whatsapp" 
            element={
              <ProtectedRoute targetStep="connect">
                <ConnectWhatsAppPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/subscription" 
            element={
              <ProtectedRoute targetStep="subscription">
                <SubscriptionPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard/*" 
            element={
              <ProtectedRoute targetStep="dashboard">
                <DashboardLayout />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
