import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Sliders, Clock, Globe } from 'lucide-react';

const BACKEND_URL = `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/settings`;

function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Settings State
  const [minDelaySec, setMinDelaySec] = useState(3);
  const [maxDelaySec, setMaxDelaySec] = useState(8);
  const [dailyLimit, setDailyLimit] = useState(200);
  const [defaultCountryCode, setDefaultCountryCode] = useState('91');
  const [sendWindowEnabled, setSendWindowEnabled] = useState(false);
  const [sendWindowStart, setSendWindowStart] = useState('10:00');
  const [sendWindowEnd, setSendWindowEnd] = useState('19:00');
  const [webhookUrl, setWebhookUrl] = useState('');

  // Fetch current settings
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(SETTINGS_FILE_PATH_OR_API_URL());
      const data = response.data;
      
      setMinDelaySec(data.minDelaySec);
      setMaxDelaySec(data.maxDelaySec);
      setDailyLimit(data.dailyLimit);
      setDefaultCountryCode(data.defaultCountryCode);
      setSendWindowEnabled(data.sendWindowEnabled);
      setSendWindowStart(data.sendWindowStart);
      setSendWindowEnd(data.sendWindowEnd);
      setWebhookUrl(data.webhookUrl || '');
      setErrorMsg('');
    } catch (err) {
      console.error('Error fetching settings:', err);
      setErrorMsg('Failed to load system settings.');
    } finally {
      setLoading(false);
    }
  };

  // Helper API Url
  const SETTINGS_FILE_PATH_OR_API_URL = () => BACKEND_URL;

  useEffect(() => {
    fetchSettings();
  }, []);

  // Handle saving configurations
  const handleSave = async (e) => {
    e.preventDefault();
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
        webhookUrl: webhookUrl.trim()
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
    } catch (err) {
      console.error('Error saving settings:', err);
      setErrorMsg(err.response?.data?.error || 'Failed to update system settings.');
    } finally {
      setSaving(false);
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
          <p className="subtitle">Configure default anti-ban parameters, time windows, and webhooks</p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && <div className="alert alert-success mb-20">{successMsg}</div>}
      {errorMsg && <div className="alert alert-error mb-20">{errorMsg}</div>}

      <form onSubmit={handleSave} className="settings-form-wrapper">
        <div className="composer-grid">
          
          {/* Column 1: Sending & Time Window Configuration */}
          <div className="settings-left-col">
            
            {/* Card A: Anti-Ban & Sending Defaults */}
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

            {/* Card B: Sending Time Windows */}
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
                <p className="preview-disclaimer mt-12">
                  When enabled, the sending engine pauses campaigns automatically if outside the active window. It resumes on the next window start.
                </p>
              </main>
            </div>

          </div>

          {/* Column 2: Webhooks & Save Trigger */}
          <div className="settings-right-col">
            
            {/* Card C: Webhook Integration */}
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
                  <p className="preview-disclaimer mt-8">
                    An HTTP POST payload will be dispatched to this URL after every contact message delivery update containing JID, Status, and Event logs metadata.
                  </p>
                </div>
              </main>
            </div>

            {/* Save Buttons panel */}
            <div className="card mt-24">
              <main className="card-body">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  style={{ maxWidth: '100%' }}
                >
                  <Save size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                  {saving ? 'Saving System settings...' : 'Save All Settings'}
                </button>
              </main>
            </div>

          </div>

        </div>
      </form>
    </div>
  );
}

export default Settings;
