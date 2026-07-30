import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { QrCode, CheckCircle, RefreshCw, LogOut } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const ConnectWhatsAppPage = () => {
  const { whatsappStatus, qr, logout, fetchWhatsAppStatus, subscriptionStatus } = useAuth();
  const navigate = useNavigate();

  // On successful scan/connection, redirect to Step 4: Subscription
  useEffect(() => {
    if (whatsappStatus === 'connected') {
      if (subscriptionStatus === 'active') {
        navigate('/dashboard', { replace: true });
      } else {
        const timer = setTimeout(() => {
          navigate('/subscription', { replace: true });
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [whatsappStatus, subscriptionStatus, navigate]);

  const handleDisconnect = async () => {
    try {
      await axios.post(`${BACKEND_URL}/logout`);
      await fetchWhatsAppStatus();
    } catch (err) {
      console.error('Error logging out WhatsApp:', err);
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
    <div className="login-page-wrapper" style={{ padding: '24px' }}>
      <div className="card" style={{ maxWidth: '580px', width: '100%' }}>
        <header className="card-header border-none pb-0" style={{ textAlign: 'center' }}>
          <div className="step-indicator-bar" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ padding: '4px 12px', borderRadius: '12px', background: 'var(--accent-teal-glow)', color: 'var(--accent-teal)', fontSize: '12px', fontWeight: '700' }}>
              Step 2 of 3: Connect WhatsApp
            </span>
          </div>
          <h1>Connect WhatsApp</h1>
          <p className="subtitle">Scan the QR code below using your phone's WhatsApp to link your sender engine.</p>
        </header>

        <main className="card-body">
          <div className="status-section">
            <div className="status-indicator" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span className="status-dot-label" style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>Session Status:</span>
              <span className={getStatusBadgeClass()}>{getStatusLabel()}</span>
            </div>

            {whatsappStatus === 'connected' ? (
              <div className="connected-view" style={{ textAlign: 'center', padding: '24px', background: 'var(--accent-teal-glow)', borderRadius: '12px', border: '1px solid var(--accent-teal-border)' }}>
                <CheckCircle size={48} color="var(--accent-teal)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>WhatsApp Successfully Connected!</h3>
                <p className="success-message" style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>
                  Redirecting to Subscription page...
                </p>
                <button 
                  onClick={handleDisconnect} 
                  className="btn btn-logout"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <LogOut size={14} /> Disconnect WhatsApp Session
                </button>
              </div>
            ) : (
              <div className="disconnected-view" style={{ textAlign: 'center' }}>
                {qr ? (
                  <div className="qr-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                    <div className="qr-box" style={{ background: '#ffffff', padding: '16px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: '2px dashed var(--accent-blue)' }}>
                      <img src={qr} alt="WhatsApp Setup QR Code" className="qr-image" style={{ width: '220px', height: '220px', display: 'block' }} />
                    </div>
                    
                    <div className="instructions" style={{ textAlign: 'left', background: 'var(--bg-primary)', padding: '16px 20px', borderRadius: '12px', width: '100%' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <QrCode size={16} /> How to scan:
                      </h4>
                      <ol style={{ paddingLeft: '20px', fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.7' }}>
                        <li>Open <strong>WhatsApp</strong> on your mobile device.</li>
                        <li>Tap <strong>Menu</strong> (Android) or <strong>Settings</strong> (iOS).</li>
                        <li>Select <strong>Linked Devices</strong> & tap <strong>Link a Device</strong>.</li>
                        <li>Scan the QR code displayed above.</li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="qr-placeholder" style={{ padding: '40px', textAlign: 'center' }}>
                    <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                    <p style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Initializing Baileys WhatsApp Engine...</p>
                    <span className="helper-text" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Generating fresh QR code, please wait a moment...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <footer className="card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={logout} className="btn-pagination" style={{ fontSize: '13px', color: 'var(--accent-red)' }}>
            Sign Out
          </button>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>BulkChat WhatsApp Engine</p>
        </footer>
      </div>
    </div>
  );
};

export default ConnectWhatsAppPage;
