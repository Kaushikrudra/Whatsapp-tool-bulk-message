import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Play, Pause, Trash2, Copy, Download, 
  ChevronLeft, Plus, FileText, Users, AlertTriangle 
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000/api';

function CampaignManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dropdowns data
  const [lists, setLists] = useState([]);
  const [templates, setTemplates] = useState([]);

  // Navigation states
  const [selectedCampaignId, setSelectedCampaignId] = useState(null); // Detail view trigger
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Campaign Detail states
  const [campaignDetail, setCampaignDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailPage, setDetailPage] = useState(1);
  const [detailPagination, setDetailPagination] = useState({});
  const [detailContacts, setDetailContacts] = useState([]);
  const [detailLogs, setDetailLogs] = useState([]);

  // Create Campaign Form state
  const [name, setName] = useState('');
  const [listId, setListId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  
  // Advanced settings state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [minDelay, setMinDelay] = useState(3);
  const [maxDelay, setMaxDelay] = useState(8);
  const [dailyLimit, setDailyLimit] = useState(200);
  const [consecutiveFailThreshold, setConsecutiveFailThreshold] = useState(20);

  // Fetch all campaigns
  const fetchCampaigns = async (showLoadingSpinner = true) => {
    try {
      if (showLoadingSpinner) setLoading(true);
      const response = await axios.get(`${BACKEND_URL}/campaigns`);
      setCampaigns(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError('Failed to load campaigns list.');
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  // Fetch lists and templates for dropdowns
  const fetchDropdownsData = async () => {
    try {
      const [listsRes, templatesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/contacts/lists`),
        axios.get(`${BACKEND_URL}/templates`)
      ]);
      setLists(listsRes.data);
      setTemplates(templatesRes.data);
    } catch (err) {
      console.error('Error fetching list/template dropdown data:', err);
    }
  };

  // Fetch specific campaign details (Detail View)
  const fetchCampaignDetail = async (id, page = 1) => {
    try {
      setDetailLoading(true);
      const response = await axios.get(`${BACKEND_URL}/campaigns/${id}?page=${page}`);
      setCampaignDetail(response.data.campaign);
      setDetailContacts(response.data.contacts);
      setDetailLogs(response.data.logs);
      setDetailPagination(response.data.pagination);
      setDetailPage(page);
    } catch (err) {
      console.error('Error fetching campaign detail:', err);
      alert('Failed to load campaign details.');
      setSelectedCampaignId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // Initial fetch and polling logic (5 seconds if any campaign is running)
  useEffect(() => {
    fetchCampaigns(true);
    fetchDropdownsData();
  }, []);

  useEffect(() => {
    const isAnyRunning = campaigns.some(c => c.status === 'running');
    let interval;

    if (isAnyRunning) {
      interval = setInterval(() => {
        fetchCampaigns(false); // poll silently without loading spinner
        if (selectedCampaignId) {
          fetchCampaignDetail(selectedCampaignId, detailPage);
        }
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [campaigns, selectedCampaignId, detailPage]);

  // Handle Campaign Detail View pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= (detailPagination.totalPages || 1)) {
      fetchCampaignDetail(selectedCampaignId, newPage);
    }
  };

  // Handle Create Campaign Submit
  const handleCreateCampaign = async (e) => {
    e.preventDefault();

    if (!name.trim()) return alert('Please enter a campaign name.');
    if (!listId) return alert('Please select a contact list.');
    if (!templateId) return alert('Please select a message template.');

    try {
      await axios.post(`${BACKEND_URL}/campaigns`, {
        name: name.trim(),
        template_id: parseInt(templateId, 10),
        list_id: parseInt(listId, 10),
        scheduled_at: scheduledAt || null,
        min_delay_seconds: parseInt(minDelay, 10),
        max_delay_seconds: parseInt(maxDelay, 10),
        daily_limit: parseInt(dailyLimit, 10),
        consecutive_fail_threshold: parseInt(consecutiveFailThreshold, 10)
      });

      // Reset form
      setName('');
      setListId('');
      setTemplateId('');
      setScheduledAt('');
      setMinDelay(3);
      setMaxDelay(8);
      setDailyLimit(200);
      setConsecutiveFailThreshold(20);
      setShowAdvanced(false);
      setShowCreateModal(false);

      await fetchCampaigns(true);
    } catch (err) {
      console.error('Error creating campaign:', err);
      alert(err.response?.data?.error || 'Failed to create campaign.');
    }
  };

  // Campaign State Operations
  const handleLaunch = async (id) => {
    try {
      await axios.post(`${BACKEND_URL}/campaigns/${id}/launch`);
      await fetchCampaigns(false);
      if (selectedCampaignId === id) fetchCampaignDetail(id, detailPage);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to launch campaign.');
    }
  };

  const handlePause = async (id) => {
    try {
      await axios.patch(`${BACKEND_URL}/campaigns/${id}/pause`);
      await fetchCampaigns(false);
      if (selectedCampaignId === id) fetchCampaignDetail(id, detailPage);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to pause campaign.');
    }
  };

  const handleResume = async (id) => {
    try {
      await axios.patch(`${BACKEND_URL}/campaigns/${id}/resume`);
      await fetchCampaigns(false);
      if (selectedCampaignId === id) fetchCampaignDetail(id, detailPage);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to resume campaign.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await axios.delete(`${BACKEND_URL}/campaigns/${id}`);
      setSelectedCampaignId(null);
      await fetchCampaigns(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete campaign.');
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await axios.post(`${BACKEND_URL}/campaigns/${id}/duplicate`);
      await fetchCampaigns(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to duplicate campaign.');
    }
  };

  const handleExportReport = (id) => {
    window.open(`${BACKEND_URL}/campaigns/${id}/export`, '_blank');
  };

  // Stats calculation
  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    paused: campaigns.filter(c => c.status === 'paused').length,
  };

  // Helper status badge classes
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'running': return 'badge status-connected'; // green
      case 'completed': return 'badge status-connected text-teal'; // teal
      case 'paused': return 'badge status-reconnecting'; // amber
      case 'scheduled': return 'badge status-connecting'; // blue
      case 'failed': return 'badge status-disconnected'; // red
      case 'draft':
      default:
        return 'badge status-disconnected'; // gray
    }
  };

  // Return detail view if a campaign is selected
  if (selectedCampaignId) {
    return (
      <div className="campaign-detail-layout">
        
        {/* Detail Header */}
        <div className="detail-navigation-bar">
          <button onClick={() => setSelectedCampaignId(null)} className="btn-back">
            <ChevronLeft size={16} />
            Back to Campaigns
          </button>
          
          {campaignDetail && (
            <div className="detail-actions">
              {campaignDetail.status === 'draft' && (
                <button onClick={() => handleLaunch(campaignDetail.id)} className="btn btn-primary-inline green-btn">
                  <Play size={14} /> Launch
                </button>
              )}
              {campaignDetail.status === 'running' && (
                <button onClick={() => handlePause(campaignDetail.id)} className="btn btn-primary-inline amber-btn">
                  <Pause size={14} /> Pause
                </button>
              )}
              {campaignDetail.status === 'paused' && (
                <button onClick={() => handleResume(campaignDetail.id)} className="btn btn-primary-inline green-btn">
                  <Play size={14} /> Resume
                </button>
              )}
              {campaignDetail.status === 'completed' && (
                <button onClick={() => handleExportReport(campaignDetail.id)} className="btn btn-primary-inline blue-btn">
                  <Download size={14} /> Export Report
                </button>
              )}
              {(campaignDetail.status === 'draft' || campaignDetail.status === 'completed') && (
                <button onClick={() => handleDelete(campaignDetail.id)} className="btn-delete-plain text-red ml-12">
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          )}
        </div>

        {detailLoading && !campaignDetail ? (
          <div className="loading-state card mt-16">
            <div className="spinner"></div>
            <p>Loading campaign details...</p>
          </div>
        ) : (
          campaignDetail && (
            <div className="detail-grid mt-16">
              
              {/* Left Side: Campaign Specs & Logs */}
              <div className="detail-specs-col">
                <div className="card">
                  <header className="card-header border-none pb-0 text-left">
                    <h3>{campaignDetail.name}</h3>
                    <p className="subtitle">Campaign Configuration & Details</p>
                  </header>
                  <main className="card-body padding-32-b">
                    <div className="campaign-metadata-grid">
                      <div className="metadata-item">
                        <span className="metadata-label">Status:</span>
                        <span className={getStatusBadgeClass(campaignDetail.status)}>
                          {campaignDetail.status}
                        </span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Template Used:</span>
                        <span className="metadata-value"><strong>{campaignDetail.template_name || 'N/A'}</strong></span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Recipient List:</span>
                        <span className="metadata-value"><strong>{campaignDetail.list_name || 'N/A'}</strong></span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Progress:</span>
                        <span className="metadata-value">
                          {campaignDetail.last_sent_index} sent
                        </span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Delays Config:</span>
                        <span className="metadata-value">
                          {campaignDetail.min_delay_seconds}s - {campaignDetail.max_delay_seconds}s
                        </span>
                      </div>
                      <div className="metadata-item">
                        <span className="metadata-label">Daily Limit:</span>
                        <span className="metadata-value">
                          {campaignDetail.daily_limit} msgs
                        </span>
                      </div>
                    </div>
                  </main>
                </div>

                {/* Campaign Log Console */}
                <div className="card mt-24">
                  <header className="card-header border-none pb-0 text-left">
                    <h4>System Logs (Last 50)</h4>
                    <p className="subtitle">Event logs generated by the bulk sending engine</p>
                  </header>
                  <main className="card-body">
                    <div className="logs-terminal-console">
                      {detailLogs.length === 0 ? (
                        <p className="empty-message">No execution logs registered for this campaign yet.</p>
                      ) : (
                        detailLogs.map((log) => (
                          <div key={log.id} className={`console-log-row ${log.event_type}`}>
                            <span className="log-timestamp">[{new Date(log.created_at).toLocaleTimeString()}]</span>
                            <span className="log-badge">{log.event_type.toUpperCase()}</span>
                            <span className="log-message">{log.message}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </main>
                </div>
              </div>

              {/* Right Side: Recipient Contacts Paginated Table */}
              <div className="detail-contacts-col">
                <div className="card">
                  <header className="card-header border-none pb-0 text-left">
                    <h3>Recipient Status</h3>
                    <p className="subtitle">Real-time delivery status of campaign contacts</p>
                  </header>
                  
                  <main className="card-body">
                    {detailContacts.length === 0 ? (
                      <p className="empty-message">No contacts registered for this campaign list.</p>
                    ) : (
                      <>
                        <div className="table-responsive">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Phone</th>
                                <th>Name</th>
                                <th>Status</th>
                                <th>Sent At</th>
                                <th>Failure Details</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detailContacts.map((contact, idx) => (
                                <tr key={idx}>
                                  <td>{contact.phone_number}</td>
                                  <td>{contact.name || '-'}</td>
                                  <td>
                                    <span className={`status-pill ${contact.status}`}>
                                      {contact.status}
                                    </span>
                                  </td>
                                  <td>
                                    {contact.sent_at ? new Date(contact.sent_at).toLocaleTimeString() : '-'}
                                  </td>
                                  <td className="text-red text-truncate-custom" title={contact.failure_reason}>
                                    {contact.failure_reason || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination controls */}
                        {detailPagination.totalPages > 1 && (
                          <div className="pagination-wrapper mt-16">
                            <button 
                              onClick={() => handlePageChange(detailPage - 1)} 
                              disabled={detailPage === 1}
                              className="btn-pagination"
                            >
                              Prev
                            </button>
                            <span className="page-indicator">
                              Page {detailPage} of {detailPagination.totalPages}
                            </span>
                            <button 
                              onClick={() => handlePageChange(detailPage + 1)} 
                              disabled={detailPage === detailPagination.totalPages}
                              className="btn-pagination"
                            >
                              Next
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </main>
                </div>
              </div>

            </div>
          )
        )}

      </div>
    );
  }

  // Return standard campaigns list view
  return (
    <div className="campaign-manager-layout">
      
      {/* Header Row */}
      <div className="page-header-row mb-20">
        <div className="header-text-side">
          <h1>Campaigns</h1>
          <p className="subtitle">Manage, schedule, and analyze bulk broadcasts</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary header-action-btn">
          <Plus size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
          Create Campaign
        </button>
      </div>

      {/* Error Message */}
      {error && <div className="alert alert-error mb-20">{error}</div>}

      {/* Stats Summary Row */}
      <div className="campaigns-stats-summary mb-20">
        <div className="mini-stat-chip">
          <span className="stat-label">Total Campaigns</span>
          <span className="stat-num">{stats.total}</span>
        </div>
        <div className="mini-stat-chip text-green">
          <span className="stat-label">Running</span>
          <span className="stat-num">{stats.running}</span>
        </div>
        <div className="mini-stat-chip text-teal">
          <span className="stat-label">Completed</span>
          <span className="stat-num">{stats.completed}</span>
        </div>
        <div className="mini-stat-chip text-amber">
          <span className="stat-label">Paused</span>
          <span className="stat-num">{stats.paused}</span>
        </div>
      </div>

      {/* Campaigns list display */}
      {loading ? (
        <div className="loading-state card">
          <div className="spinner"></div>
          <p>Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card text-center padding-48">
          <p className="empty-message-large">No campaigns created yet. Start broadcasting by creating your first campaign!</p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary mt-16 max-w-200">
            Create Campaign
          </button>
        </div>
      ) : (
        <div className="campaigns-list-grid">
          {campaigns.map((camp) => {
            const total = camp.total_contacts || 0;
            const sent = camp.sent_count || 0;
            const progressPercent = total > 0 ? Math.round((sent / total) * 100) : 0;

            return (
              <div 
                key={camp.id} 
                className="campaign-card card" 
                onClick={() => setSelectedCampaignId(camp.id)}
                title="Click to view details, logs, and recipient reports"
              >
                <div className="campaign-card-header">
                  <div className="title-status-row">
                    <h4>{camp.name}</h4>
                    <span className={getStatusBadgeClass(camp.status)}>
                      {camp.status === 'running' && <span className="pulsing-dot-animation"></span>}
                      {camp.status}
                    </span>
                  </div>
                  <span className="campaign-date">{new Date(camp.created_at).toLocaleDateString()}</span>
                </div>

                <div className="campaign-card-body">
                  
                  {/* Progress bar */}
                  <div className="progress-bar-container">
                    <div className="progress-bar-labels">
                      <span className="progress-label-value">
                        {sent} / {total} Sent ({progressPercent}%)
                      </span>
                    </div>
                    <div className="progress-bar-bg">
                      <div 
                        className="progress-bar-fill" 
                        style={{ width: `${progressPercent}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="campaign-details-small mt-12">
                    <p><Users size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> List: <strong>{camp.list_name}</strong></p>
                    <p><FileText size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Template: <strong>{camp.template_name}</strong></p>
                  </div>
                </div>

                {/* Card Actions Footer - Stop Propagation to avoid opening detail view */}
                <div className="campaign-card-actions" onClick={(e) => e.stopPropagation()}>
                  
                  {/* Launch trigger */}
                  {(camp.status === 'draft' || camp.status === 'scheduled') && (
                    <button onClick={() => handleLaunch(camp.id)} className="icon-action-btn launch" title="Launch Campaign">
                      <Play size={14} />
                      <span>Launch</span>
                    </button>
                  )}

                  {/* Pause trigger */}
                  {camp.status === 'running' && (
                    <button onClick={() => handlePause(camp.id)} className="icon-action-btn pause" title="Pause Campaign">
                      <Pause size={14} />
                      <span>Pause</span>
                    </button>
                  )}

                  {/* Resume trigger */}
                  {camp.status === 'paused' && (
                    <button onClick={() => handleResume(camp.id)} className="icon-action-btn resume" title="Resume Campaign">
                      <Play size={14} />
                      <span>Resume</span>
                    </button>
                  )}

                  {/* Export report trigger */}
                  {camp.status === 'completed' && (
                    <button onClick={() => handleExportReport(camp.id)} className="icon-action-btn export" title="Export CSV Report">
                      <Download size={14} />
                      <span>Report</span>
                    </button>
                  )}

                  {/* Duplicate trigger */}
                  <button onClick={() => handleDuplicate(camp.id)} className="icon-action-btn duplicate" title="Duplicate Campaign Settings">
                    <Copy size={14} />
                    <span>Copy</span>
                  </button>

                  {/* Delete trigger */}
                  {(camp.status === 'draft' || camp.status === 'completed' || camp.status === 'failed') && (
                    <button onClick={() => handleDelete(camp.id)} className="icon-action-btn delete" title="Delete Campaign">
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE CAMPAIGN MODAL OVERLAY */}
      {showCreateModal && (
        <div className="modal-backdrop">
          <div className="modal-container card">
            <header className="card-header border-none pb-0 text-left">
              <div className="modal-title-row">
                <h2>Create Broadcast Campaign</h2>
                <button onClick={() => setShowCreateModal(false)} className="btn-close-modal">
                  <X size={18} />
                </button>
              </div>
              <p className="subtitle">Configure a new bulk messaging broadcast campaign</p>
            </header>

            <main className="card-body">
              <form onSubmit={handleCreateCampaign} className="create-campaign-form">
                
                {/* Campaign Name */}
                <div className="form-group">
                  <label htmlFor="campaign-name" className="form-label">Campaign Name</label>
                  <input 
                    type="text" 
                    id="campaign-name" 
                    className="file-input"
                    placeholder="e.g. July Product Promo" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                {/* Select Contact List */}
                <div className="form-group mt-16">
                  <label htmlFor="select-list" className="form-label">Select Contact List</label>
                  <select 
                    id="select-list" 
                    className="file-input select-input" 
                    value={listId}
                    onChange={(e) => setListId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Contact List --</option>
                    {lists.map(list => (
                      <option key={list.id} value={list.id}>
                        {list.name} ({list.valid_count} valid contacts)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Message Template */}
                <div className="form-group mt-16">
                  <label htmlFor="select-template" className="form-label">Select Message Template</label>
                  <select 
                    id="select-template" 
                    className="file-input select-input" 
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Message Template --</option>
                    {templates.map(temp => (
                      <option key={temp.id} value={temp.id}>
                        {temp.name} - ({temp.body.substring(0, 50)}...)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Schedule datetime picker */}
                <div className="form-group mt-16">
                  <label htmlFor="schedule-time" className="form-label">
                    Schedule Launch Time <span className="helper-label">(Optional - leave empty for draft)</span>
                  </label>
                  <input 
                    type="datetime-local" 
                    id="schedule-time" 
                    className="file-input"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                  />
                </div>

                {/* Collapsible Advanced settings section */}
                <div className="advanced-settings-section mt-20">
                  <button 
                    type="button" 
                    onClick={() => setShowAdvanced(!showAdvanced)} 
                    className="advanced-toggle-btn"
                  >
                    {showAdvanced ? 'Hide Advanced Settings ▲' : 'Show Advanced Settings ▼'}
                  </button>

                  {showAdvanced && (
                    <div className="advanced-fields-box mt-12">
                      <div className="advanced-inputs-grid">
                        <div className="form-group">
                          <label className="form-label">Min Delay (sec)</label>
                          <input 
                            type="number" 
                            min="1" 
                            className="file-input"
                            value={minDelay}
                            onChange={(e) => setMinDelay(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Max Delay (sec)</label>
                          <input 
                            type="number" 
                            min="1" 
                            className="file-input"
                            value={maxDelay}
                            onChange={(e) => setMaxDelay(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Daily Limit</label>
                          <input 
                            type="number" 
                            min="1" 
                            className="file-input"
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(e.target.value)}
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Failure Safety Threshold (%)</label>
                          <input 
                            type="number" 
                            min="1" 
                            max="100"
                            className="file-input"
                            value={consecutiveFailThreshold}
                            onChange={(e) => setConsecutiveFailThreshold(e.target.value)}
                          />
                        </div>
                      </div>
                      <p className="advanced-tip-text">
                        <AlertTriangle size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                        Note: Anti-ban delays randomize wait times between contacts. The failure threshold pauses campaigns automatically if connections drop.
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Modal Actions */}
                <div className="modal-actions-row mt-24">
                  <button type="submit" className="btn btn-primary">
                    Create Campaign
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowCreateModal(false)} 
                    className="btn-cancel-plain"
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </main>
          </div>
        </div>
      )}

    </div>
  );
}

// Minimal helper cross button inside model header
function X(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

export default CampaignManager;
