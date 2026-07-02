import React from 'react';
import { Users, CheckCircle2, FolderHeart, Activity, Trash2, ShieldAlert } from 'lucide-react';

function Dashboard({ 
  lists, 
  status, 
  qr, 
  handleLogout, 
  actionLoading, 
  handleDeleteList,
  getStatusBadgeClass,
  getStatusLabel,
  error,
  loading
}) {
  // Aggregate stats from existing lists data
  const totalContacts = lists.reduce((sum, list) => sum + (list.total_count || 0), 0);
  const validContacts = lists.reduce((sum, list) => sum + (list.valid_count || 0), 0);
  const totalLists = lists.length;

  return (
    <div className="dashboard-layout">
      {/* Stats Overview Grid */}
      <div className="stats-grid">
        {/* Stat Card 1: Total Contacts */}
        <div className="stat-card">
          <div className="stat-icon-container color-blue">
            <Users size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{totalContacts}</span>
            <span className="stat-label">Total Contacts</span>
          </div>
        </div>

        {/* Stat Card 2: Valid Contacts */}
        <div className="stat-card">
          <div className="stat-icon-container color-teal">
            <CheckCircle2 size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{validContacts}</span>
            <span className="stat-label">Valid Contacts</span>
          </div>
        </div>

        {/* Stat Card 3: Lists Uploaded */}
        <div className="stat-card">
          <div className="stat-icon-container color-purple">
            <FolderHeart size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-value">{totalLists}</span>
            <span className="stat-label">Lists Uploaded</span>
          </div>
        </div>

        {/* Stat Card 4: WhatsApp Connection Status */}
        <div className="stat-card">
          <div className="stat-icon-container color-amber">
            <Activity size={20} />
          </div>
          <div className="stat-details">
            <span className="stat-value text-capitalize">{status}</span>
            <span className="stat-label">WhatsApp Status</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="dashboard-columns">
        {/* Column 1: Recent Lists Card */}
        <div className="card list-preview-card">
          <header className="card-header text-left border-none pb-0">
            <h3>Recent Contact Lists</h3>
            <p className="subtitle">Last uploaded contact files</p>
          </header>
          <div className="card-body">
            {lists.length === 0 ? (
              <p className="empty-message">No contact lists uploaded yet.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>List Name</th>
                      <th>Total</th>
                      <th>Valid</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lists.slice(0, 5).map((list) => (
                      <tr key={list.id}>
                        <td className="list-name-col"><strong>{list.name}</strong></td>
                        <td>{list.total_count}</td>
                        <td className="text-valid">{list.valid_count}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteList(list.id)}
                            className="btn-delete-icon"
                            title="Delete List"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: WhatsApp Connection Card */}
        <div className="card connection-preview-card">
          <header className="card-header text-left border-none pb-0">
            <h3>WhatsApp Connection</h3>
            <p className="subtitle">Link device or check authentication status</p>
          </header>
          
          <div className="card-body">
            {error && (
              <div className="alert alert-error">
                <ShieldAlert size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                <strong>Server Unreachable:</strong> Check if server is running on port 5000.
              </div>
            )}

            {loading && !error ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Checking WhatsApp status...</p>
              </div>
            ) : (
              <div className="status-section align-stretch">
                <div className="status-indicator">
                  <span className="status-dot-label">Session Status:</span>
                  <span className={getStatusBadgeClass()}>{getStatusLabel()}</span>
                </div>

                {status === 'connected' ? (
                  <div className="connected-view">
                    <div className="success-icon">✅</div>
                    <h3>Connected to WhatsApp</h3>
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
                          <h4>Quick setup instructions:</h4>
                          <ol>
                            <li>Open WhatsApp on your mobile device.</li>
                            <li>Navigate to <strong>Linked Devices</strong>.</li>
                            <li>Tap <strong>Link a Device</strong> and scan this code.</li>
                          </ol>
                        </div>
                      </div>
                    ) : (
                      <div className="qr-placeholder">
                        <div className="spinner"></div>
                        <p>Initializing WhatsApp socket & generating QR...</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
