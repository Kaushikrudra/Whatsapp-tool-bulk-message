import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Save, Trash2, Edit3, X, Sparkles } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000/api/templates';

function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form State
  const [name, setName] = useState('');
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState(null); // stores template ID if editing
  const [saving, setSaving] = useState(false);

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
        });
      } else {
        // Create template
        await axios.post(BACKEND_URL, {
          name: name.trim(),
          body: body.trim(),
        });
      }

      // Reset form
      setName('');
      setBody('');
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
    setEditingId(template.id);
    
    // Scroll smoothly to composer
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setName('');
    setBody('');
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
          <p className="subtitle">Compose message templates using customized variables and formatting</p>
        </header>

        <main className="card-body">
          <form onSubmit={handleSave} className="template-form">
            <div className="composer-grid">
              
              {/* Left Column: Form Inputs */}
              <div className="composer-inputs">
                <div className="form-group">
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

                <div className="form-group mt-16">
                  <div className="label-row">
                    <label htmlFor="template-body-textarea" className="form-label">
                      Message Body
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
              </div>

              {/* Right Column: Live Preview */}
              <div className="composer-preview">
                <div className="preview-card-wrapper">
                  <div className="preview-card-header">
                    <Sparkles size={16} className="text-teal" />
                    <span>Live Message Preview</span>
                  </div>
                  <div className="whatsapp-chat-bubble">
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
            <div className="composer-actions mt-24">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
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
                    <div className="template-icon-title">
                      <FileText size={18} className="text-teal" />
                      <h4>{template.name}</h4>
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
