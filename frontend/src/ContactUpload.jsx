import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Search, Tag, FileSpreadsheet, Users, Trash2, Edit, Check } from 'lucide-react';

const BACKEND_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/contacts`;

function ContactUpload({ lists, loadingLists, fetchLists, handleDeleteList }) {
  // Navigation tab
  const [subTab, setSubTab] = useState('upload'); // 'upload' | 'directory'

  // Upload state
  const [file, setFile] = useState(null);
  const [uploadTags, setUploadTags] = useState('');
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  // Directory / Search state
  const [contacts, setContacts] = useState([]);
  const [distinctTags, setDistinctTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalContacts, setTotalContacts] = useState(0);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  // Inline edit state
  const [editingContactId, setEditingContactId] = useState(null);
  const [editTagsVal, setEditTagsVal] = useState('');

  // Fetch unique tag list
  const fetchDistinctTags = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/tags`);
      setDistinctTags(response.data);
    } catch (err) {
      console.error('Error fetching distinct tags:', err);
    }
  };

  // Fetch paginated contacts based on query params
  const fetchContactsDirectory = useCallback(async () => {
    try {
      setLoadingDirectory(true);
      const tagParam = selectedTag ? `&tag=${encodeURIComponent(selectedTag)}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const response = await axios.get(`${BACKEND_URL}?page=${currentPage}${tagParam}${searchParam}`);
      setContacts(response.data.contacts);
      setTotalPages(response.data.pagination.totalPages);
      setTotalContacts(response.data.pagination.total);
    } catch (err) {
      console.error('Error loading contacts directory:', err);
    } finally {
      setLoadingDirectory(false);
    }
  }, [currentPage, selectedTag, searchQuery]);

  useEffect(() => {
    if (subTab === 'directory') {
      fetchContactsDirectory();
      fetchDistinctTags();
    }
  }, [subTab, currentPage, selectedTag, fetchContactsDirectory]);

  // Handle Search Input Submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchContactsDirectory();
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a CSV or Excel file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    if (uploadTags.trim()) {
      formData.append('tags', uploadTags);
    }

    setUploading(true);
    setError(null);
    setSummary(null);

    try {
      const response = await axios.post(`${BACKEND_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setSummary(response.data);
      setFile(null);
      setUploadTags('');
      
      // Reset input element
      document.getElementById('contact-file-input').value = '';
      
      // Refresh the uploaded lists
      await fetchLists();
    } catch (err) {
      console.error('Error uploading contact list:', err);
      const serverError = err.response?.data?.error || 'Failed to upload contact list. Verify file headers.';
      setError(serverError);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (listId) => {
    try {
      await handleDeleteList(listId);
      // If deleted list is currently showing in summary, clear it
      if (summary && summary.listId === listId) {
        setSummary(null);
      }
    } catch (err) {
      console.error('Error deleting contact list:', err);
    }
  };

  const toggleTagInString = (currentStr, tagToToggle) => {
    const currentTags = currentStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
    if (currentTags.includes(tagToToggle)) {
      const updated = currentTags.filter(t => t !== tagToToggle);
      return updated.join(', ');
    } else {
      return [...currentTags, tagToToggle].join(', ');
    }
  };

  // Inline Tag Editing
  const startEditTags = (contact) => {
    setEditingContactId(contact.id);
    setEditTagsVal(contact.tags ? contact.tags.join(', ') : '');
  };

  const saveEditTags = async (contactId) => {
    try {
      const splitTags = editTagsVal
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const response = await axios.put(`${BACKEND_URL}/${contactId}/tags`, {
        tags: splitTags
      });

      // Update in contacts list state
      setContacts(contacts.map(c => c.id === contactId ? response.data : c));
      setEditingContactId(null);
      
      // Refresh unique tags list
      fetchDistinctTags();
    } catch (err) {
      console.error('Error updating tags:', err);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // Simple tag badge styling mapper
  const getTagColorClass = (tag) => {
    const lower = tag.toLowerCase();
    if (lower.includes('hot') || lower.includes('vip') || lower.includes('lead')) return 'bg-badge-red';
    if (lower.includes('cold') || lower.includes('inactive')) return 'bg-badge-gray';
    if (lower.includes('client') || lower.includes('customer')) return 'bg-badge-green';
    return 'bg-badge-blue';
  };

  return (
    <div className="card" style={{ textAlign: 'left' }}>
      <header className="card-header" style={{ borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Contact Management</h2>
          <p className="subtitle" style={{ margin: '4px 0 0 0' }}>Import contacts, manage directories, and group segments with tags</p>
        </div>
        
        {/* Toggle subtab tabs */}
        <div style={{ display: 'flex', background: 'var(--bg-primary)', padding: '4px', borderRadius: '8px' }}>
          <button 
            className={`btn ${subTab === 'upload' ? 'btn-secondary' : ''}`} 
            style={{ border: 'none', background: subTab === 'upload' ? 'var(--bg-card)' : 'transparent', color: subTab === 'upload' ? 'var(--text-primary)' : 'var(--text-muted)', padding: '6px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setSubTab('upload')}
          >
            <FileSpreadsheet size={15} />
            Lists & Upload
          </button>
          <button 
            className={`btn ${subTab === 'directory' ? 'btn-secondary' : ''}`} 
            style={{ border: 'none', background: subTab === 'directory' ? 'var(--bg-card)' : 'transparent', color: subTab === 'directory' ? 'var(--text-primary)' : 'var(--text-muted)', padding: '6px 14px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => setSubTab('directory')}
          >
            <Users size={15} />
            Contacts Directory
          </button>
        </div>
      </header>

      <main className="card-body" style={{ padding: '24px' }}>
        
        {/* TAB 1: LISTS & UPLOAD FORM */}
        {subTab === 'upload' && (
          <div>
            <form onSubmit={handleUpload} className="upload-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '600px' }}>
              <div className="file-input-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="file-label" htmlFor="contact-file-input" style={{ fontWeight: '600', fontSize: '13px' }}>
                  Select CSV or Excel (.xlsx, .xls) File
                </label>
                <input
                  type="file"
                  id="contact-file-input"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileChange}
                  className="file-input"
                  style={{ padding: '8px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}
                />
                {file && <span className="selected-filename" style={{ fontSize: '12px', color: 'var(--accent-teal)', fontWeight: '600' }}>Selected: {file.name}</span>}
              </div>

              {/* Tag Input for complete spreadsheet list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '600', fontSize: '13px' }}>Apply Tags to All Contacts in List</label>
                <input 
                  type="text" 
                  placeholder="e.g. hot lead, client, summer-promo"
                  value={uploadTags}
                  onChange={(e) => setUploadTags(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)',
                    fontSize: '13.5px', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none'
                  }}
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Separate multiple tags with commas</span>
                
                {/* Clickable Preset tag suggestions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>Presets:</span>
                  {['hot lead', 'cold', 'warm', 'client', 'vip', 'retailer', 'wholesaler', 'july-promo', 'new-year'].map(preset => {
                    const isSelected = uploadTags.split(',').map(t => t.trim()).includes(preset);
                    return (
                      <span
                        key={preset}
                        onClick={() => setUploadTags(toggleTagInString(uploadTags, preset))}
                        style={{
                          fontSize: '11px', padding: '3px 8px', borderRadius: '12px', border: `1px solid ${isSelected ? 'var(--accent-teal)' : 'var(--border-color)'}`,
                          background: isSelected ? 'rgba(20, 184, 166, 0.08)' : 'transparent',
                          cursor: 'pointer', color: isSelected ? 'var(--accent-teal)' : 'var(--text-secondary)', userSelect: 'none', transition: 'all 0.15s ease'
                        }}
                      >
                        {preset}
                      </span>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={uploading || !file}
                style={{ alignSelf: 'flex-start' }}
              >
                {uploading ? 'Processing & Uploading...' : 'Upload Contacts'}
              </button>
            </form>

            {error && <div className="alert alert-error mt-16">{error}</div>}

            {summary && (
              <div className="summary-card mt-24" style={{ padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(20, 184, 166, 0.02)' }}>
                <h3 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>Upload Successful!</h3>
                <p className="summary-listname" style={{ margin: '0 0 16px 0', fontSize: '14px' }}><strong>List:</strong> {summary.listName}</p>
                <div className="summary-grid" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  <div className="summary-stat" style={{ flex: '1', minWidth: '100px', background: 'var(--bg-card)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                    <span className="stat-value" style={{ display: 'block', fontSize: '20px', fontWeight: '700' }}>{summary.total}</span>
                    <span className="stat-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Rows</span>
                  </div>
                  <div className="summary-stat stat-valid" style={{ flex: '1', minWidth: '100px', background: 'rgba(20, 184, 166, 0.05)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(20, 184, 166, 0.15)', textAlign: 'center' }}>
                    <span className="stat-value" style={{ display: 'block', fontSize: '20px', fontWeight: '700', color: 'var(--accent-teal)' }}>{summary.valid}</span>
                    <span className="stat-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Valid</span>
                  </div>
                  <div className="summary-stat stat-invalid" style={{ flex: '1', minWidth: '100px', background: 'rgba(239, 68, 68, 0.05)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.15)', textAlign: 'center' }}>
                    <span className="stat-value" style={{ display: 'block', fontSize: '20px', fontWeight: '700', color: '#ef4444' }}>{summary.invalid}</span>
                    <span className="stat-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Invalid</span>
                  </div>
                  <div className="summary-stat stat-duplicate" style={{ flex: '1', minWidth: '100px', background: 'rgba(245, 158, 11, 0.05)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.15)', textAlign: 'center' }}>
                    <span className="stat-value" style={{ display: 'block', fontSize: '20px', fontWeight: '700', color: '#f59e0b' }}>{summary.duplicates}</span>
                    <span className="stat-label" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Duplicates</span>
                  </div>
                </div>
              </div>
            )}

            <div className="lists-section mt-32">
              <h3 style={{ fontSize: '16px', margin: '0 0 16px 0' }}>Your Contact Lists</h3>
              {loadingLists ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading contact lists...</p>
                </div>
              ) : lists.length === 0 ? (
                <p className="empty-message">No contact lists uploaded yet.</p>
              ) : (
                <div className="table-responsive">
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px' }}>List Name</th>
                        <th style={{ padding: '12px 16px' }}>Total Rows</th>
                        <th style={{ padding: '12px 16px' }}>Valid Contacts</th>
                        <th style={{ padding: '12px 16px' }}>Date Uploaded</th>
                        <th style={{ padding: '12px 16px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lists.map((list) => (
                        <tr key={list.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '12px 16px' }}><strong>{list.name}</strong></td>
                          <td style={{ padding: '12px 16px' }}>{list.total_count}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--accent-teal)', fontWeight: '600' }}>{list.valid_count}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{formatDate(list.created_at)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={() => handleDelete(list.id)}
                              className="btn btn-secondary"
                              style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '6px 12px', background: 'transparent' }}
                            >
                              <Trash2 size={13} />
                              Delete
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
        )}

        {/* TAB 2: CONTACTS DIRECTORY & TAGS SEARCH */}
        {subTab === 'directory' && (
          <div>
            {/* SEARCH AND FILTERS */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px', alignItems: 'center', background: 'var(--bg-primary)', padding: '16px', borderRadius: '8px' }}>
              
              {/* Text Search Form */}
              <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flex: '1', minWidth: '260px', gap: '8px' }}>
                <div style={{ display: 'flex', flex: '1', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '6px', padding: '8px 12px', alignItems: 'center', gap: '8px' }}>
                  <Search size={16} style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    placeholder="Search by name, phone, or company..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%', color: 'var(--text-primary)' }}
                  />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ padding: '8px 16px' }}>Search</button>
              </form>

              {/* Tag Dropdown Filter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
                <Tag size={16} style={{ color: 'var(--text-muted)' }} />
                <select
                  value={selectedTag}
                  onChange={(e) => { setSelectedTag(e.target.value); setCurrentPage(1); }}
                  style={{
                    padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)',
                    background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none', fontSize: '13px', flex: '1'
                  }}
                >
                  <option value="">Filter by Segment Tag</option>
                  {distinctTags.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              {/* Quick Status count */}
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
                Total Contacts: {totalContacts}
              </span>
            </div>

            {/* DIRECTORY LIST TABLE */}
            {loadingDirectory ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading directory contacts...</p>
              </div>
            ) : contacts.length === 0 ? (
              <p className="empty-message" style={{ margin: '40px 0' }}>No contacts matching filters.</p>
            ) : (
              <div className="table-responsive">
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                      <th style={{ padding: '12px 16px' }}>Phone Number</th>
                      <th style={{ padding: '12px 16px' }}>Recipient Name</th>
                      <th style={{ padding: '12px 16px' }}>Company</th>
                      <th style={{ padding: '12px 16px' }}>Segment Tags</th>
                      <th style={{ padding: '12px 16px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map((contact) => (
                      <tr key={contact.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: '600' }}>{contact.phone_number}</td>
                        <td style={{ padding: '12px 16px' }}>{contact.name || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>{contact.company || '-'}</td>
                        
                        {/* Tags list */}
                        <td style={{ padding: '12px 16px' }}>
                          {editingContactId === contact.id ? (
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input
                                  type="text"
                                  value={editTagsVal}
                                  onChange={(e) => setEditTagsVal(e.target.value)}
                                  style={{
                                    padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-color)',
                                    fontSize: '12px', background: 'var(--bg-card)', color: 'var(--text-primary)', outline: 'none'
                                  }}
                                  autoFocus
                                />
                                <button 
                                  onClick={() => saveEditTags(contact.id)}
                                  style={{ border: 'none', background: 'var(--accent-teal)', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                >
                                  <Check size={14} />
                                </button>
                              </div>
                              {/* Clickable Suggestions inside edit tags cell */}
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px', maxWidth: '280px' }}>
                                {['hot lead', 'cold', 'warm', 'client', 'vip', 'retailer', 'wholesaler'].map(preset => {
                                  const isSelected = editTagsVal.split(',').map(t => t.trim()).includes(preset);
                                  return (
                                    <span
                                      key={preset}
                                      onClick={() => setEditTagsVal(toggleTagInString(editTagsVal, preset))}
                                      style={{
                                        fontSize: '9.5px', padding: '1px 5px', borderRadius: '4px', border: `1px solid ${isSelected ? '#3b82f6' : 'var(--border-color)'}`,
                                        background: isSelected ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                        cursor: 'pointer', color: isSelected ? '#3b82f6' : 'var(--text-muted)', userSelect: 'none', transition: 'all 0.15s ease'
                                      }}
                                    >
                                      {preset}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {contact.tags && contact.tags.length > 0 ? (
                                contact.tags.map(t => (
                                  <span key={t} className={`status-pill ${getTagColorClass(t)}`} style={{ fontSize: '10.5px', padding: '2px 6px', borderRadius: '4px', textTransform: 'capitalize' }}>
                                    {t}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '11px', fontStyle: 'italic' }}>No tags</span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Tag editor button */}
                        <td style={{ padding: '12px 16px' }}>
                          {editingContactId !== contact.id && (
                            <button
                              onClick={() => startEditTags(contact)}
                              className="btn-edit-tag"
                            >
                              <Edit size={12} />
                              Edit Tags
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* PAGINATION BUTTONS */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px', alignItems: 'center' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12.5px' }}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12.5px' }}
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* CUSTOM INTERNAL CSS FOR DYNAMIC BADGES */}
      <style>{`
        .bg-badge-red {
          background: rgba(239, 68, 68, 0.1) !important;
          color: #ef4444 !important;
          border: 1px solid rgba(239, 68, 68, 0.2) !important;
        }
        .bg-badge-gray {
          background: rgba(107, 114, 128, 0.1) !important;
          color: #6b7280 !important;
          border: 1px solid rgba(107, 114, 128, 0.2) !important;
        }
        .bg-badge-green {
          background: rgba(20, 184, 166, 0.1) !important;
          color: var(--accent-teal) !important;
          border: 1px solid rgba(20, 184, 166, 0.2) !important;
        }
        .bg-badge-blue {
          background: rgba(59, 130, 246, 0.1) !important;
          color: #3b82f6 !important;
          border: 1px solid rgba(59, 130, 246, 0.2) !important;
        }
        .btn-secondary {
          background: var(--bg-card) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border-color) !important;
          max-width: none !important;
          width: auto !important;
          padding: 8px 16px !important;
          cursor: pointer !important;
          font-size: 13.5px !important;
          border-radius: var(--radius-sm) !important;
          font-weight: 600 !important;
          transition: all 0.2s ease !important;
        }
        .btn-secondary:hover:not(:disabled) {
          background: var(--bg-primary) !important;
        }
        .btn-edit-tag {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 6px 12px !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          border-radius: 4px !important;
          background: rgba(59, 130, 246, 0.05) !important;
          color: #3b82f6 !important;
          border: 1px solid rgba(59, 130, 246, 0.2) !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          width: auto !important;
          max-width: none !important;
        }
        .btn-edit-tag:hover {
          background: rgba(59, 130, 246, 0.12) !important;
          border-color: rgba(59, 130, 246, 0.4) !important;
        }
      `}</style>

    </div>
  );
}

export default ContactUpload;
