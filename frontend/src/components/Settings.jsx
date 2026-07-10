import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Sliders, Clock, Globe, Plus, Trash2, Bot, MessageSquare, AlertCircle } from 'lucide-react';

const BACKEND_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/settings`;
const RULES_BACKEND_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/bot-rules`;

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  // Settings State
  const [minDelaySec, setMinDelaySec] = useState(3);
  const [maxDelaySec, setMaxDelaySec] = useState(8);
  const [dailyLimit, setDailyLimit] = useState(200);
  const [defaultCountryCode, setDefaultCountryCode] = useState('91');
  const [sendWindowEnabled, setSendWindowEnabled] = useState(false);
  const [sendWindowStart, setSendWindowStart] = useState('10:00');
  const [sendWindowEnd, setSendWindowEnd] = useState('19:00');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Inbox Automation Settings State
  const [globalGreetingEnabled, setGlobalGreetingEnabled] = useState(false);
  const [globalGreetingText, setGlobalGreetingText] = useState('');
  const [awayModeEnabled, setAwayModeEnabled] = useState(false);
  const [awayModeStart, setAwayModeStart] = useState('18:00');
  const [awayModeEnd, setAwayModeEnd] = useState('09:00');
  const [awayModeText, setAwayModeText] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiPromptInstructions, setGeminiPromptInstructions] = useState('');

  // Keyword Rules State
  const [botRules, setBotRules] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [newResponseText, setNewResponseText] = useState('');
  const [newMatchType, setNewMatchType] = useState('contains');

  // Fetch current settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(BACKEND_URL);
      const data = response.data;
      
      setMinDelaySec(data.minDelaySec);
      setMaxDelaySec(data.maxDelaySec);
      setDailyLimit(data.dailyLimit);
      setDefaultCountryCode(data.defaultCountryCode);
      setSendWindowEnabled(data.sendWindowEnabled);
      setSendWindowStart(data.sendWindowStart);
      setSendWindowEnd(data.sendWindowEnd);
      setWebhookUrl(data.webhookUrl || '');

      setGlobalGreetingEnabled(data.globalGreetingEnabled || false);
      setGlobalGreetingText(data.globalGreetingText || '');
      setAwayModeEnabled(data.awayModeEnabled || false);
      setAwayModeStart(data.awayModeStart || '18:00');
      setAwayModeEnd(data.awayModeEnd || '09:00');
      setAwayModeText(data.awayModeText || '');
      setGeminiApiKey(data.geminiApiKey || '');
      setGeminiPromptInstructions(data.geminiPromptInstructions || '');

      setErrorMsg('');
    } catch (err) {
      console.error('Error fetching settings:', err);
      setErrorMsg('Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Keyword Rules
  const fetchRules = async () => {
    try {
      const response = await axios.get(RULES_BACKEND_URL);
      setBotRules(response.data);
    } catch (err) {
      console.error('Error fetching bot rules:', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchRules();
  }, []);

  // Handle saving configurations
  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const response = await axios.put(BACKEND_URL, {
        minDelaySec: parseInt(minDelaySec, 10),
        maxDelaySec: parseInt(maxDelaySec, 10),
        dailyLimit: parseInt(dailyLimit, 10),
        defaultCountryCode: defaultCountryCode.trim(),
        sendWindowEnabled,
        sendWindowStart,
        sendWindowEnd,
        webhookUrl: webhookUrl.trim(),
        globalGreetingEnabled,
        globalGreetingText: globalGreetingText.trim(),
        awayModeEnabled,
        awayModeStart,
        awayModeEnd,
        awayModeText: awayModeText.trim(),
        geminiApiKey: geminiApiKey.trim(),
        geminiPromptInstructions: geminiPromptInstructions.trim(),
      });

      const data = response.data;
      setSuccessMsg('Settings updated successfully!');
      
      // Sync state back from response
      setMinDelaySec(data.minDelaySec);
      setMaxDelaySec(data.maxDelaySec);
      setDailyLimit(data.dailyLimit);
      setDefaultCountryCode(data.defaultCountryCode);
      setSendWindowEnabled(data.sendWindowEnabled);
      setSendWindowStart(data.sendWindowStart);
      setSendWindowEnd(data.sendWindowEnd);
      setWebhookUrl(data.webhookUrl || '');

      setGlobalGreetingEnabled(data.globalGreetingEnabled || false);
      setGlobalGreetingText(data.globalGreetingText || '');
      setAwayModeEnabled(data.awayModeEnabled || false);
      setAwayModeStart(data.awayModeStart || '18:00');
      setAwayModeEnd(data.awayModeEnd || '09:00');
      setAwayModeText(data.awayModeText || '');
      setGeminiApiKey(data.geminiApiKey || '');
      setGeminiPromptInstructions(data.geminiPromptInstructions || '');
    } catch (err) {
      console.error('Error saving settings:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to update system settings.');
    } finally {
      setSaving(false);
    }
  };

  // Add keyword rule
  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!newKeyword.trim() || !newResponseText.trim()) return;

    setSuccessMsg('');
    setErrorMsg('');

    try {
      await axios.post(RULES_BACKEND_URL, {
        keyword: newKeyword.trim(),
        response_text: newResponseText.trim(),
        match_type: newMatchType,
      });
      setNewKeyword('');
      setNewResponseText('');
      setNewMatchType('contains');
      fetchRules();
      setSuccessMsg('Keyword rule created successfully!');
    } catch (err) {
      console.error('Error adding rule:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to create keyword rule.');
    }
  };

  // Toggle keyword rule active state
  const handleToggleRule = async (rule) => {
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await axios.put(`${RULES_BACKEND_URL}/${rule.id}`, {
        is_active: !rule.is_active,
      });
      fetchRules();
    } catch (err) {
      console.error('Error toggling rule status:', err);
      setErrorMsg('Failed to update keyword rule status.');
    }
  };

  // Delete keyword rule
  const handleDeleteRule = async (id) => {
    setSuccessMsg('');
    setErrorMsg('');
    try {
      await axios.delete(`${RULES_BACKEND_URL}/${id}`);
      fetchRules();
      setSuccessMsg('Keyword rule deleted successfully!');
    } catch (err) {
      console.error('Error deleting rule:', err);
      setErrorMsg('Failed to delete keyword rule.');
    }
  };

  if (loading) {
    return (
      <div className="loading-state card">
        <div className="spinner"></div>
        <p>Loading configurations...</p>
      </div>
    );
  }

  return (
    <div className="settings-page-layout">
      {/* Page Header */}
      <div className="page-header-row mb-20 text-left">
        <div className="header-text-side">
          <h1>System Settings</h1>
          <p className="subtitle">Configure broadcasting anti-ban rules, auto-responders, keyword bots, and AI assistants</p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && <div className="alert alert-success mb-20">{successMsg}</div>}
      {errorMsg && <div className="alert alert-error mb-20">{errorMsg}</div>}

      {/* Premium Tabs Navigation */}
      <div 
        className="filter-tabs-row"
        style={{ 
          display: 'flex', 
          gap: '8px', 
          marginBottom: '24px', 
          borderBottom: '1px solid var(--border-color)', 
          paddingBottom: '12px' 
        }}
      >
        <button 
          type="button" 
          className={`filter-tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General & Anti-Ban
        </button>
        <button 
          type="button" 
          className={`filter-tab-btn ${activeTab === 'responders' ? 'active' : ''}`}
          onClick={() => setActiveTab('responders')}
        >
          Auto-Responders
        </button>
        <button 
          type="button" 
          className={`filter-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          Keyword Bot Rules
        </button>
        <button 
          type="button" 
          className={`filter-tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai')}
        >
          AI Chatbot
        </button>
      </div>

      {/* TAB CONTENT: General & Anti-Ban */}
      {activeTab === 'general' && (
        <form onSubmit={handleSave} className="settings-form-wrapper">
          <div className="composer-grid">
            {/* Column 1 */}
            <div className="settings-left-col">
              <div className="card">
                <header className="card-header border-none pb-0 text-left">
                  <div className="preview-card-header text-teal">
                    <Sliders size={18} />
                    <h3>Sending Configuration</h3>
                  </div>
                  <p className="subtitle">Tune delays and safety boundaries to prevent WhatsApp accounts banning</p>
                </header>
                <main className="card-body">
                  <div className="advanced-inputs-grid">
                    <div className="form-group">
                      <label className="form-label">Min Delay (seconds)</label>
                      <input 
                        type="number" 
                        min="1" 
                        max="30"
                        className="file-input"
                        value={minDelaySec}
                        onChange={(e) => setMinDelaySec(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Max Delay (seconds)</label>
                      <input 
                        type="number" 
                        min="5" 
                        max="120"
                        className="file-input"
                        value={maxDelaySec}
                        onChange={(e) => setMaxDelaySec(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group mt-12">
                      <label className="form-label">Daily Message Limit</label>
                      <input 
                        type="number" 
                        min="50" 
                        max="1000"
                        className="file-input"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group mt-12">
                      <label className="form-label">Default Country Code</label>
                      <input 
                        type="text" 
                        className="file-input"
                        placeholder="e.g. 91"
                        value={defaultCountryCode}
                        onChange={(e) => setDefaultCountryCode(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </main>
              </div>

              <div className="card mt-24">
                <header className="card-header border-none pb-0 text-left">
                  <div className="preview-card-header text-teal">
                    <Clock size={18} />
                    <h3>Send Time Window</h3>
                  </div>
                  <p className="subtitle">Restrict broadcasting to specific hours to avoid spamming at night</p>
                </header>
                <main className="card-body text-left">
                  <div className="toggle-switch-row">
                    <label className="toggle-label-text" htmlFor="toggle-window">
                      <strong>Restrict sending times:</strong>
                    </label>
                    <input
                      type="checkbox"
                      id="toggle-window"
                      className="checkbox-switch"
                      checked={sendWindowEnabled}
                      onChange={(e) => setSendWindowEnabled(e.target.checked)}
                    />
                  </div>
                  {sendWindowEnabled && (
                    <div className="advanced-inputs-grid mt-16 animate-fade-in">
                      <div className="form-group">
                        <label className="form-label">Start Time (HH:MM)</label>
                        <input 
                          type="time" 
                          className="file-input"
                          value={sendWindowStart}
                          onChange={(e) => setSendWindowStart(e.target.value)}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">End Time (HH:MM)</label>
                        <input 
                          type="time" 
                          className="file-input"
                          value={sendWindowEnd}
                          onChange={(e) => setSendWindowEnd(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}
                </main>
              </div>
            </div>

            {/* Column 2 */}
            <div className="settings-right-col">
              <div className="card">
                <header className="card-header border-none pb-0 text-left">
                  <div className="preview-card-header text-teal">
                    <Globe size={18} />
                    <h3>Webhook Integration</h3>
                  </div>
                  <p className="subtitle">Dispatch status updates dynamically to third-party endpoints</p>
                </header>
                <main className="card-body text-left">
                  <div className="form-group">
                    <label className="form-label">Webhook URL</label>
                    <input 
                      type="url" 
                      className="file-input"
                      placeholder="https://yourdomain.com/webhooks/whatsapp" 
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                  </div>
                </main>
              </div>

              <div className="card mt-24">
                <main className="card-body">
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
                    <Save size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {saving ? 'Saving...' : 'Save General Settings'}
                  </button>
                </main>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB CONTENT: Auto-Responders */}
      {activeTab === 'responders' && (
        <form onSubmit={handleSave} className="settings-form-wrapper text-left">
          <div className="composer-grid">
            <div className="settings-left-col">
              <div className="card">
                <header className="card-header border-none pb-0">
                  <div className="preview-card-header text-teal">
                    <MessageSquare size={18} />
                    <h3>First Contact Greeting</h3>
                  </div>
                  <p className="subtitle">Send an automated reply when a customer contacts you for the first time</p>
                </header>
                <main className="card-body">
                  <div className="toggle-switch-row mb-16">
                    <label className="toggle-label-text" htmlFor="toggle-greeting">
                      <strong>Enable greeting message:</strong>
                    </label>
                    <input
                      type="checkbox"
                      id="toggle-greeting"
                      className="checkbox-switch"
                      checked={globalGreetingEnabled}
                      onChange={(e) => setGlobalGreetingEnabled(e.target.checked)}
                    />
                  </div>
                  {globalGreetingEnabled && (
                    <div className="form-group animate-fade-in">
                      <label className="form-label">Greeting Message Text</label>
                      <textarea
                        className="file-input"
                        rows="4"
                        placeholder="Welcome message text..."
                        value={globalGreetingText}
                        onChange={(e) => setGlobalGreetingText(e.target.value)}
                        required
                        style={{ resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                  )}
                </main>
              </div>
            </div>

            <div className="settings-right-col">
              <div className="card">
                <header className="card-header border-none pb-0">
                  <div className="preview-card-header text-teal">
                    <Clock size={18} />
                    <h3>Away Mode (Auto-Responder)</h3>
                  </div>
                  <p className="subtitle">Automatically reply when customers message you outside of office hours</p>
                </header>
                <main className="card-body">
                  <div className="toggle-switch-row mb-16">
                    <label className="toggle-label-text" htmlFor="toggle-away">
                      <strong>Enable Away Mode:</strong>
                    </label>
                    <input
                      type="checkbox"
                      id="toggle-away"
                      className="checkbox-switch"
                      checked={awayModeEnabled}
                      onChange={(e) => setAwayModeEnabled(e.target.checked)}
                    />
                  </div>
                  {awayModeEnabled && (
                    <div className="animate-fade-in">
                      <div className="advanced-inputs-grid mb-12">
                        <div className="form-group">
                          <label className="form-label">Away Hours Start (HH:MM)</label>
                          <input 
                            type="time" 
                            className="file-input"
                            value={awayModeStart}
                            onChange={(e) => setAwayModeStart(e.target.value)}
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Away Hours End (HH:MM)</label>
                          <input 
                            type="time" 
                            className="file-input"
                            value={awayModeEnd}
                            onChange={(e) => setAwayModeEnd(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Away Reply Text</label>
                        <textarea
                          className="file-input"
                          rows="4"
                          placeholder="Away message text..."
                          value={awayModeText}
                          onChange={(e) => setAwayModeText(e.target.value)}
                          required
                          style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />
                      </div>
                    </div>
                  )}
                </main>
              </div>

              <div className="card mt-24">
                <main className="card-body">
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
                    <Save size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {saving ? 'Saving...' : 'Save Responders'}
                  </button>
                </main>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* TAB CONTENT: Keyword Rules */}
      {activeTab === 'rules' && (
        <div className="settings-form-wrapper text-left">
          <div className="composer-grid">
            {/* Create Rule */}
            <div className="settings-left-col">
              <div className="card">
                <header className="card-header border-none pb-0">
                  <div className="preview-card-header text-teal">
                    <Plus size={18} />
                    <h3>Create Keyword Rule</h3>
                  </div>
                  <p className="subtitle">Add keywords that trigger automatic preset answers</p>
                </header>
                <main className="card-body">
                  <form onSubmit={handleAddRule}>
                    <div className="form-group">
                      <label className="form-label">Keyword / Phrase</label>
                      <input 
                        type="text" 
                        className="file-input"
                        placeholder="e.g. price" 
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        required
                      />
                    </div>
                    <div className="form-group mt-12">
                      <label className="form-label">Match Type</label>
                      <select 
                        className="file-input"
                        value={newMatchType}
                        onChange={(e) => setNewMatchType(e.target.value)}
                      >
                        <option value="contains">Contains (e.g. 'pricing' matches 'price')</option>
                        <option value="exact">Exact Match (Keyword matches text exactly)</option>
                      </select>
                    </div>
                    <div className="form-group mt-12">
                      <label className="form-label">Automated Answer Text</label>
                      <textarea
                        className="file-input"
                        rows="4"
                        placeholder="Type the auto-response message..."
                        value={newResponseText}
                        onChange={(e) => setNewResponseText(e.target.value)}
                        required
                        style={{ resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary mt-16" style={{ width: '100%' }}>
                      <Plus size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                      Create Bot Rule
                    </button>
                  </form>
                </main>
              </div>
            </div>

            {/* Keyword Rules List */}
            <div className="settings-right-col">
              <div className="card">
                <header className="card-header border-none pb-0">
                  <div className="preview-card-header text-teal">
                    <Sliders size={18} />
                    <h3>Active Bot Rules</h3>
                  </div>
                  <p className="subtitle">Manage or remove currently configured bot keyword rules</p>
                </header>
                <main className="card-body">
                  {botRules.length === 0 ? (
                    <div className="text-center p-20 text-secondary">
                      <AlertCircle size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                      <p>No keyword rules defined yet.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Keyword</th>
                            <th>Match</th>
                            <th>Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {botRules.map((rule) => (
                            <tr key={rule.id}>
                              <td><strong>{rule.keyword}</strong></td>
                              <td>
                                <span className={`status-pill ${rule.match_type === 'exact' ? 'status-sent' : 'status-queued'}`}>
                                  {rule.match_type}
                                </span>
                              </td>
                              <td>
                                <input
                                  type="checkbox"
                                  className="checkbox-switch"
                                  style={{ transform: 'scale(0.85)' }}
                                  checked={rule.is_active}
                                  onChange={() => handleToggleRule(rule)}
                                />
                              </td>
                              <td>
                                <button 
                                  className="btn-delete-icon"
                                  onClick={() => handleDeleteRule(rule.id)}
                                  title="Delete rule"
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
                </main>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: AI Chatbot */}
      {activeTab === 'ai' && (
        <form onSubmit={handleSave} className="settings-form-wrapper text-left">
          <div className="composer-grid">
            <div className="settings-left-col">
              <div className="card">
                <header className="card-header border-none pb-0">
                  <div className="preview-card-header text-teal">
                    <Bot size={18} />
                    <h3>Gemini AI Integration</h3>
                  </div>
                  <p className="subtitle">Power dynamic conversation replies using Google Gemini API</p>
                </header>
                <main className="card-body">
                  <div className="form-group">
                    <label className="form-label">Gemini API Key</label>
                    <input 
                      type="password" 
                      className="file-input"
                      placeholder="AIzaSy..." 
                      value={geminiApiKey}
                      onChange={(e) => setGeminiApiKey(e.target.value)}
                    />
                    <p className="preview-disclaimer mt-8">
                      Your Gemini Key is used securely in the server backend to process context prompts for contacts who have AI enabled.
                    </p>
                  </div>
                  <div className="form-group mt-16">
                    <label className="form-label">AI System Prompt Instructions</label>
                    <textarea
                      className="file-input"
                      rows="6"
                      placeholder="You are a customer assistant..."
                      value={geminiPromptInstructions}
                      onChange={(e) => setGeminiPromptInstructions(e.target.value)}
                      required
                      style={{ resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <p className="preview-disclaimer mt-8">
                      Define the character, guidelines, business description, and response rules the AI chatbot must follow when replying.
                    </p>
                  </div>
                </main>
              </div>
            </div>

            <div className="settings-right-col">
              <div className="card">
                <header className="card-header border-none pb-0">
                  <div className="preview-card-header text-teal">
                    <AlertCircle size={18} />
                    <h3>AI Operational Notes</h3>
                  </div>
                  <p className="subtitle">Important security and limits about Gemini auto-reply integration</p>
                </header>
                <main className="card-body">
                  <p className="preview-disclaimer mb-12">
                    *   AI replies are **disabled by default** on all conversation threads. You can toggle AI ON or OFF for each individual customer directly within their thread inside the **Chat Inbox** interface.
                  </p>
                  <p className="preview-disclaimer mb-12">
                    *   The AI reads the **last 10 messages** from history for context before replying to the customer's text.
                  </p>
                  <p className="preview-disclaimer">
                    *   If a human agent manually responds from the dashboard, the system switches to **Agent Manual** mode and mutes AI replies automatically.
                  </p>
                </main>
              </div>

              <div className="card mt-24">
                <main className="card-body">
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ width: '100%' }}>
                    <Save size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                    {saving ? 'Saving...' : 'Save AI Configurations'}
                  </button>
                </main>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

export default Settings;
