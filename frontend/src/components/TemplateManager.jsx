import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Save, Trash2, Edit3, X, Sparkles } from 'lucide-react';

const BACKEND_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/templates`;

function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState('none');
  const [mediaFileName, setMediaFileName] = useState('');
  
  const [editingId, setEditingId] = useState(null); // stores template ID if editing
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch all templates
  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get(BACKEND_URL);
      setTemplates(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Handle uploading media attachments to Supabase Storage
  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadProgress(0);
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/media/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      setMediaUrl(response.data.publicUrl);
      setMediaType(response.data.mediaType);
      setMediaFileName(file.name);
    } catch (err) {
      console.error('Error uploading media:', err);
      alert(err.response?.data?.error || 'Failed to upload media file.');
    } finally {
      setUploading(false);
    }
  };

  // Remove attached media
  const handleRemoveMedia = () => {
    setMediaUrl('');
    setMediaType('none');
    setMediaFileName('');
  };

  // Insert variable tag at cursor position inside body textarea
  const insertVariable = (variable) => {
    const textarea = document.getElementById('template-body-textarea');
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    const textBefore = body.substring(0, startPos);
    const textAfter = body.substring(endPos, body.length);
    const newBody = textBefore + variable + textAfter;

    setBody(newBody);

    // Reposition cursor after inserting variable
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = startPos + variable.length;
      textarea.selectionEnd = startPos + variable.length;
    }, 0);
  };

  // Generate dynamic live preview text
  const getPreviewText = (text) => {
    if (!text) return 'Start typing to see live preview...';
    return text
      .replace(/{name}/g, 'John')
      .replace(/{company}/g, 'Acme Corp')
      .replace(/{custom1}/g, 'SampleVar1')
      .replace(/{custom2}/g, 'SampleVar2');
  };

  // Handle Save Template (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a template name.');
      return;
    }
    if (!body.trim()) {
      alert('Please enter the template body.');
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update template
        await axios.put(`${BACKEND_URL}/${editingId}`, {
          name: name.trim(),
          body: body.trim(),
          media_url: mediaUrl || null,
          media_type: mediaType || 'none',
        });
      } else {
        // Create template
        await axios.post(BACKEND_URL, {
          name: name.trim(),
          body: body.trim(),
          media_url: mediaUrl || null,
          media_type: mediaType || 'none',
        });
      }

      // Reset form
      setName('');
      setBody('');
      setMediaUrl('');
      setMediaType('none');
      setMediaFileName('');
      setEditingId(null);
      await fetchTemplates();
    } catch (err) {
      console.error('Error saving template:', err);
      alert(err.response?.data?.error || 'Failed to save template.');
    } finally {
      setSaving(false);
    }
  };

  // Load template into composer for editing
  const handleEditInit = (template) => {
    setName(template.name);
    setBody(template.body);
    setMediaUrl(template.media_url || '');
    setMediaType(template.media_type || 'none');
    setMediaFileName(template.media_url ? template.media_url.split('/').pop().substring(0, 30) : '');
    setEditingId(template.id);
    
    // Scroll smoothly to composer
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setName('');
    setBody('');
    setMediaUrl('');
    setMediaType('none');
    setMediaFileName('');
    setEditingId(null);
  };

  // Handle Delete Template
  const handleDelete = async (templateId) => {
    if (!window.confirm('Are you sure you want to delete this template?')) {
      return;
    }

    try {
      await axios.delete(`${BACKEND_URL}/${templateId}`);
      if (editingId === templateId) {
        handleCancelEdit();
      }
      await fetchTemplates();
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Failed to delete template.');
    }
  };

  // Format timestamp for display
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  // Truncate template body for preview in list view
  const truncateText = (text, maxLength = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="template-manager-layout">
      {/* SECTION A: Template Composer */}
      <div className="card">
        <header className="card-header border-none pb-0 text-left">
          <h2>{editingId ? 'Edit Message Template' : 'Create Message Template'}</h2>
          <p className="subtitle">Compose message templates using customized variables, formatting, and media attachments</p>
        </header>

        <main className="card-body">
          <form onSubmit={handleSave} className="template-form">
            <div className="composer-grid">
              
              {/* Left Column: Form Inputs */}
              <div className="composer-inputs">
                <div className="form-group text-left">
                  <label htmlFor="template-name-input" className="form-label">
                    Template Name
                  </label>
                  <input
                    type="text"
                    id="template-name-input"
                    className="file-input"
                    placeholder="e.g. Welcome Broadcast, Payment Reminder"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group mt-16 text-left">
                  <div className="label-row">
                    <label htmlFor="template-body-textarea" className="form-label">
                      Message Body / Caption
                    </label>
                    <span className={`char-counter ${body.length > 1000 ? 'warning' : ''}`}>
                      {body.length} / 1000 characters {body.length > 1000 && '(Warning: High length)'}
                    </span>
                  </div>
                  <textarea
                    id="template-body-textarea"
                    className="file-input text-area"
                    placeholder="Type your message here... Use {name}, {company}, {custom1}, {custom2} as dynamic placeholder tags."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={6}
                    required
                  />
                  
                  {/* Variables Insertion Chips */}
                  <div className="variables-section mt-8">
                    <span className="section-label-tiny">Insert variables:</span>
                    <div className="chips-container">
                      <button
                        type="button"
                        onClick={() => insertVariable('{name}')}
                        className="chip-btn"
                        title="Inserts {name} placeholder"
                      >
                        + Name ({'{name}'})
                      </button>
                      <button
                        type="button"
                        onClick={() => insertVariable('{company}')}
                        className="chip-btn"
                        title="Inserts {company} placeholder"
                      >
                        + Company ({'{company}'})
                      </button>
                      <button
                        type="button"
                        onClick={() => insertVariable('{custom1}')}
                        className="chip-btn"
                        title="Inserts {custom1} placeholder"
                      >
                        + Custom 1 ({'{custom1}'})
                      </button>
                      <button
                        type="button"
                        onClick={() => insertVariable('{custom2}')}
                        className="chip-btn"
                        title="Inserts {custom2} placeholder"
                      >
                        + Custom 2 ({'{custom2}'})
                      </button>
                    </div>
                  </div>

                  {/* Formatting Visual Hints */}
                  <div className="formatting-hints mt-12">
                    <span className="section-label-tiny">Formatting hints:</span>
                    <code className="format-code">
                      *<strong>bold text</strong>* &nbsp;&nbsp;&nbsp; _<i>italic text</i>_ &nbsp;&nbsp;&nbsp; ~<del>strikethrough</del>~
                    </code>
                  </div>
                </div>

                {/* Attach Media Section */}
                <div className="form-group mt-20 text-left">
                  <label className="form-label">Attach Media (Optional)</label>
                  <p className="subtitle" style={{ fontSize: '12px', marginTop: '-4px', marginBottom: '8px' }}>
                    Upload image (JPG/PNG), document (PDF), or video (MP4) to send with this template
                  </p>
                  
                  {!mediaUrl ? (
                    <div className="media-upload-zone" style={{
                      border: '2px dashed var(--border-color)',
                      borderRadius: '8px',
                      padding: '20px',
                      textAlign: 'center',
                      background: 'var(--bg-primary)',
                      cursor: 'pointer',
                      position: 'relative'
                    }}>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/jpg, application/pdf, video/mp4"
                        onChange={handleMediaUpload}
                        disabled={uploading}
                        style={{
                          position: 'absolute',
                          top: 0, left: 0, width: '100%', height: '100%',
                          opacity: 0, cursor: 'pointer'
                        }}
                      />
                      {uploading ? (
                        <div>
                          <div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>
                          <p style={{ fontSize: '13px', margin: 0 }}>Uploading file... {uploadProgress}%</p>
                        </div>
                      ) : (
                        <div>
                          <p style={{ fontSize: '13px', margin: 0, color: 'var(--text-secondary)' }}>
                            Click to browse or drag & drop files here
                          </p>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            Supported: JPG, PNG, PDF, MP4 (Max 50MB)
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="media-attached-preview" style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderRadius: '8px',
                      background: 'var(--bg-hover)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                        {mediaType === 'image' && (
                          <img 
                            src={mediaUrl} 
                            alt="Attached Thumbnail" 
                            style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border-color)' }} 
                          />
                        )}
                        <div style={{ minWidth: 0, textAlign: 'left' }}>
                          <span className={`status-pill ${mediaType}`} style={{
                            display: 'inline-block',
                            fontSize: '9px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            marginBottom: '4px',
                            lineHeight: '1',
                            background: mediaType === 'image' ? 'rgba(20, 184, 166, 0.1)' : mediaType === 'pdf' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: mediaType === 'image' ? 'var(--accent-teal)' : mediaType === 'pdf' ? '#3b82f6' : '#f59e0b'
                          }}>
                            {mediaType}
                          </span>
                          <p style={{ fontSize: '13px', margin: 0, fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }} title={mediaFileName}>
                            {mediaFileName || 'Attached media file'}
                          </p>
                        </div>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={handleRemoveMedia} 
                        className="btn-delete"
                        style={{ padding: '6px 12px' }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Preview */}
              <div className="composer-preview">
                <div className="preview-card-wrapper">
                  <div className="preview-card-header">
                    <Sparkles size={16} className="text-teal" />
                    <span>Live Message Preview</span>
                  </div>
                  <div className="whatsapp-chat-bubble" style={{ textAlign: 'left' }}>
                    {mediaUrl && mediaType === 'image' && (
                      <div className="bubble-media-preview" style={{ marginBottom: '8px', borderRadius: '6px', overflow: 'hidden' }}>
                        <img src={mediaUrl} alt="Preview" style={{ width: '100%', maxHeight: '180px', objectFit: 'cover' }} />
                      </div>
                    )}
                    {mediaUrl && mediaType === 'pdf' && (
                      <div className="bubble-media-preview" style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', 
                        background: 'rgba(0,0,0,0.03)', borderRadius: '6px', marginBottom: '8px',
                        border: '1px solid rgba(0,0,0,0.05)', textAlign: 'left'
                      }}>
                        <FileText size={24} style={{ color: '#ef4444' }} />
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '13px', margin: 0, fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {mediaFileName || 'document.pdf'}
                          </p>
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>PDF Document</span>
                        </div>
                      </div>
                    )}
                    {mediaUrl && mediaType === 'video' && (
                      <div className="bubble-media-preview" style={{ marginBottom: '8px', borderRadius: '6px', overflow: 'hidden', background: '#000', maxHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <video src={mediaUrl} controls style={{ width: '100%', maxHeight: '180px' }} />
                      </div>
                    )}
                    <p className="preview-text-render">{getPreviewText(body)}</p>
                    <span className="chat-bubble-time">
                      {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="preview-disclaimer">
                    Note: *bold*, _italic_, and ~strikethrough~ markdown symbols will render correctly directly within WhatsApp client application interfaces.
                  </p>
                </div>
              </div>

            </div>

            {/* Actions Buttons Row */}
            <div className="composer-actions mt-24 text-left">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving || uploading}
              >
                <Save size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                {saving ? 'Saving...' : editingId ? 'Update Template' : 'Save Template'}
              </button>
              
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="btn btn-cancel ml-12"
                >
                  <X size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </main>
      </div>

      {/* SECTION B: Saved Templates List */}
      <div className="card mt-32">
        <header className="card-header border-none pb-0 text-left">
          <h3>Saved Message Templates</h3>
          <p className="subtitle">Select templates to edit or delete</p>
        </header>

        <main className="card-body">
          {error && <div className="alert alert-error">{error}</div>}

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <p className="empty-message">No templates saved yet. Create your first template above!</p>
          ) : (
            <div className="templates-list-grid">
              {templates.map((template) => (
                <div key={template.id} className="template-item-card">
                  <div className="template-item-header">
                    <div className="template-icon-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                      <FileText size={18} className="text-teal" />
                      <h4>{template.name}</h4>
                      {template.media_type && template.media_type !== 'none' && (
                        <span className={`status-pill ${template.media_type}`} style={{
                          fontSize: '8px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: template.media_type === 'image' ? 'rgba(20, 184, 166, 0.1)' : template.media_type === 'pdf' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: template.media_type === 'image' ? 'var(--accent-teal)' : template.media_type === 'pdf' ? '#3b82f6' : '#f59e0b'
                        }}>
                          📎 {template.media_type}
                        </span>
                      )}
                    </div>
                    <div className="template-item-actions">
                      <button
                        onClick={() => handleEditInit(template)}
                        className="action-icon-btn edit-btn"
                        title="Edit Template"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="action-icon-btn delete-btn"
                        title="Delete Template"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="template-item-body">
                    <p className="template-body-snippet">{truncateText(template.body, 120)}</p>
                  </div>
                  <div className="template-item-footer">
                    <span>Updated: {formatDate(template.updated_at)}</span>
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

export default TemplateManager;
