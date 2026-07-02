import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { RefreshCw } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000/api/logs';

function SystemLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'info' | 'warning' | 'error' | 'success'

  // Fetch logs
  const fetchLogs = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      const response = await axios.get(BACKEND_URL);
      setLogs(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('Failed to fetch system logs.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  // Setup auto-refresh every 10 seconds
  useEffect(() => {
    fetchLogs(true);
    const interval = setInterval(() => fetchLogs(false), 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter logs locally based on selection
  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.event_type === filter;
  });

  // Human-readable timestamp formatter
  const formatTimestamp = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get color dot class
  const getDotClass = (type) => {
    switch (type) {
      case 'info': return 'dot dot-info';
      case 'warning': return 'dot dot-warning';
      case 'error': return 'dot dot-error';
      case 'success': return 'dot dot-success';
      default:
        return 'dot';
    }
  };

  return (
    <div className="system-logs-layout">
      {/* Page Header */}
      <div className="page-header-row mb-20 text-left">
        <div className="header-text-side">
          <h1>System Logs</h1>
          <p className="subtitle">Real-time log events of all running campaigns and system connections</p>
        </div>
        <button onClick={() => fetchLogs(true)} className="btn btn-pagination" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Error notification */}
      {error && <div className="alert alert-error mb-20">{error}</div>}

      <div className="card text-left">
        
        {/* Filter Toolbar */}
        <header className="card-header border-none pb-0 text-left" style={{ paddingBottom: '20px' }}>
          <div className="logs-filter-toolbar">
            <span className="toolbar-label">Filter logs:</span>
            <div className="filter-buttons-group">
              <button 
                onClick={() => setFilter('all')} 
                className={`filter-tab-btn ${filter === 'all' ? 'active' : ''}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilter('info')} 
                className={`filter-tab-btn ${filter === 'info' ? 'active' : ''}`}
              >
                Info
              </button>
              <button 
                onClick={() => setFilter('success')} 
                className={`filter-tab-btn ${filter === 'success' ? 'active' : ''}`}
              >
                Success
              </button>
              <button 
                onClick={() => setFilter('warning')} 
                className={`filter-tab-btn ${filter === 'warning' ? 'active' : ''}`}
              >
                Warning
              </button>
              <button 
                onClick={() => setFilter('error')} 
                className={`filter-tab-btn ${filter === 'error' ? 'active' : ''}`}
              >
                Error
              </button>
            </div>
          </div>
        </header>

        {/* Timeline body */}
        <main className="card-body padding-t-0">
          {loading && logs.length === 0 ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading timeline events...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <p className="empty-message text-center" style={{ padding: '48px 0' }}>
              No log entries matching the filters found.
            </p>
          ) : (
            <div className="logs-timeline-container">
              {filteredLogs.map((log) => (
                <div key={log.id} className="timeline-row">
                  <div className="timeline-dot-col">
                    <span className={getDotClass(log.event_type)}></span>
                    <div className="timeline-line"></div>
                  </div>
                  <div className="timeline-content-col">
                    <div className="timeline-row-meta">
                      <span className="log-source-tag">
                        {log.campaign_name ? `Campaign: ${log.campaign_name}` : 'System'}
                      </span>
                      <span className="log-time-formatted">
                        {formatTimestamp(log.created_at)}
                      </span>
                    </div>
                    <p className="log-row-message">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

      </div>
    </div>
  );
}

export default SystemLogs;
