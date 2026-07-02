import React, { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = 'http://localhost:5000/api/contacts';

function ContactUpload({ lists, loadingLists, fetchLists, handleDeleteList }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

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

  // Helper to format date strings
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div className="card">
      <header className="card-header">
        <h2>Contact Management</h2>
        <p className="subtitle">Import CSV/Excel files and manage recipient lists</p>
      </header>

      <main className="card-body">
        {/* Upload Form */}
        <form onSubmit={handleUpload} className="upload-form">
          <div className="file-input-wrapper">
            <label className="file-label" htmlFor="contact-file-input">
              Select CSV or Excel (.xlsx, .xls) File
            </label>
            <input
              type="file"
              id="contact-file-input"
              accept=".csv, .xlsx, .xls"
              onChange={handleFileChange}
              className="file-input"
            />
            {file && <span className="selected-filename">Selected: {file.name}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={uploading || !file}
          >
            {uploading ? 'Processing & Uploading...' : 'Upload Contacts'}
          </button>
        </form>

        {/* Error Message */}
        {error && <div className="alert alert-error mt-16">{error}</div>}

        {/* Upload Summary Result */}
        {summary && (
          <div className="summary-card mt-24">
            <h3>Upload Successful!</h3>
            <p className="summary-listname"><strong>List:</strong> {summary.listName}</p>
            <div className="summary-grid">
              <div className="summary-stat">
                <span className="stat-value">{summary.total}</span>
                <span className="stat-label">Total Rows</span>
              </div>
              <div className="summary-stat stat-valid">
                <span className="stat-value">{summary.valid}</span>
                <span className="stat-label">Valid</span>
              </div>
              <div className="summary-stat stat-invalid">
                <span className="stat-value">{summary.invalid}</span>
                <span className="stat-label">Invalid</span>
              </div>
              <div className="summary-stat stat-duplicate">
                <span className="stat-value">{summary.duplicates}</span>
                <span className="stat-label">Duplicates</span>
              </div>
            </div>
            {summary.contacts && summary.contacts.length > 0 && (
              <div className="preview-section mt-16">
                <h4>Data Preview (First 5 Rows)</h4>
                <div className="table-responsive">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Phone</th>
                        <th>Name</th>
                        <th>Company</th>
                        <th>Custom 1</th>
                        <th>Custom 2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.contacts.slice(0, 5).map((contact, idx) => (
                        <tr key={idx}>
                          <td>{contact.phone_number}</td>
                          <td>{contact.name || '-'}</td>
                          <td>{contact.company || '-'}</td>
                          <td>{contact.custom1 || '-'}</td>
                          <td>{contact.custom2 || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Contact Lists Table */}
        <div className="lists-section mt-32">
          <h3>Your Contact Lists</h3>
          {loadingLists ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading contact lists...</p>
            </div>
          ) : lists.length === 0 ? (
            <p className="empty-message">No contact lists uploaded yet.</p>
          ) : (
            <div className="table-responsive mt-16">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>List Name</th>
                    <th>Total</th>
                    <th>Valid</th>
                    <th>Date Uploaded</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {lists.map((list) => (
                    <tr key={list.id}>
                      <td className="list-name-col"><strong>{list.name}</strong></td>
                      <td>{list.total_count}</td>
                      <td className="text-valid">{list.valid_count}</td>
                      <td className="date-col">{formatDate(list.created_at)}</td>
                      <td>
                        <button
                          onClick={() => handleDelete(list.id)}
                          className="btn-delete"
                          title="Delete List"
                        >
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
      </main>
    </div>
  );
}

export default ContactUpload;
